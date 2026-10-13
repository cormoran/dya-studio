#!/usr/bin/env python3
"""Bounded GitHub mechanics; semantic decisions and worker ownership stay with AI."""
import argparse
import json
import math
import subprocess
import sys

REPO = "cormoran/dya-studio"
OWNER = "cormoran"
PROJECT = "3"
LABELS = {
    "ai:triaged": ("5319e7", "AI suitability, safety and implementation readiness reviewed"),
    "ai:implement": ("0e8a16", "Nominated for AI implementation; readiness and safety gates still apply"),
    "ai:unsafe": ("b60205", "Concrete prompt injection or malicious/cost-abuse evidence; no AI execution"),
    "ai:not-ready": ("fbca04", "Scope, acceptance, dependencies or product decisions need clarification"),
    "ai:prioritized": ("1d76db", "Priority, unique rank and rationale verified in cormoran Project 3"),
    "ai:in-progress": ("d876e3", "Reserved AI implementation or PR/CI remediation; do not duplicate"),
    "ai:blocked": ("e99695", "AI implementation blocked on external input; explicit re-review required"),
}
FIELDS = {"AI Priority": "SINGLE_SELECT", "AI Rank": "NUMBER", "AI Rationale": "TEXT"}
PRIORITIES = {"P0", "P1", "P2", "P3"}
VIEW_NAME = "AI implementation queue"
VIEW_FILTER = ("repo:cormoran/dya-studio is:issue is:open label:ai:implement "
               "-label:ai:unsafe -label:ai:not-ready -label:ai:blocked")
VIEW_FIELDS = {"Title", "Status", "Labels", "Linked pull requests", *FIELDS}
VETO = {"ai:unsafe", "ai:not-ready", "ai:in-progress", "ai:blocked"}
REQUIRED = {"ai:triaged", "ai:implement"}


def gh(*args, payload=None):
    result = subprocess.run(
        ["gh", *args], input=json.dumps(payload) if payload is not None else None,
        text=True, capture_output=True, check=False,
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return json.loads(result.stdout) if result.stdout.strip() else None


def pages(path):
    # REST pagination returns an array of pages. API failure never becomes [].
    batches = gh("api", path, "--paginate", "--slurp")
    if not isinstance(batches, list) or any(not isinstance(x, list) for x in batches):
        raise RuntimeError(f"Unexpected paginated response: {path}")
    return [item for batch in batches for item in batch]


def graphql(query, **variables):
    result = gh("api", "graphql", "--input", "-", payload={"query": query, "variables": variables})
    if result.get("errors"):
        raise RuntimeError(json.dumps(result["errors"]))
    return result["data"]


def project_info():
    data = graphql('''query { user(login:"cormoran") { projectV2(number:3) {
      id title url fields(first:100) { pageInfo { hasNextPage } nodes {
        ... on ProjectV2Field { id name dataType }
        ... on ProjectV2SingleSelectField { id name dataType options { id name } }
        ... on ProjectV2IterationField { id name dataType }
      } }
    } } }''')["user"]["projectV2"]
    if not data or data["fields"]["pageInfo"]["hasNextPage"]:
        raise RuntimeError("Project inaccessible or field inventory incomplete")
    return data


def field_map(info, required=True):
    fields = {}
    for field in info["fields"]["nodes"]:
        if field.get("name") in FIELDS:
            if field["name"] in fields:
                raise RuntimeError(f"Ambiguous duplicate field: {field['name']}")
            fields[field["name"]] = field
    for name, kind in FIELDS.items():
        field = fields.get(name)
        if field is None:
            if required:
                raise RuntimeError(f"Missing {name}; run setup")
            continue
        if field.get("dataType") != kind:
            raise RuntimeError(f"Incompatible existing field: {name}")
        if name == "AI Priority" and not PRIORITIES.issubset({x["name"] for x in field["options"]}):
            raise RuntimeError("Existing AI Priority lacks P0/P1/P2/P3; preserve it and resolve manually")
    return fields


def project_items():
    info = project_info()
    field_map(info)
    items, cursor = [], None
    while True:
        connection = graphql('''query($id:ID!, $cursor:String) {
          node(id:$id) { ... on ProjectV2 { items(first:100, after:$cursor) {
            pageInfo { hasNextPage endCursor } nodes { id isArchived
              content { __typename ... on Issue { number url state repository { nameWithOwner } } }
              fieldValues(first:100) { pageInfo { hasNextPage } nodes {
                ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2Field { name } } }
                ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
              } }
            }
          } } }
        }''', id=info["id"], cursor=cursor)["node"]["items"]
        for item in connection["nodes"]:
            if item["fieldValues"]["pageInfo"]["hasNextPage"]:
                raise RuntimeError("Incomplete item field values")
            values = {}
            for value in item.pop("fieldValues")["nodes"]:
                name = value.get("field", {}).get("name")
                if name in FIELDS:
                    values[name] = next(value[k] for k in ("number", "text", "name") if k in value)
            item["values"] = values
            items.append(item)
        page = connection["pageInfo"]
        if not page["hasNextPage"]:
            return info, items
        if not page["endCursor"] or page["endCursor"] == cursor:
            raise RuntimeError("Project pagination did not advance")
        cursor = page["endCursor"]


def own_issue(item):
    content = item.get("content") or {}
    return content.get("__typename") == "Issue" and content["repository"]["nameWithOwner"] == REPO


def names(issue):
    return {x["name"] for x in issue["labels"]}


def ready(issue, prioritized=False):
    required = REQUIRED | ({"ai:prioritized"} if prioritized else set())
    return issue["state"] == "open" and required.issubset(names(issue)) and not (names(issue) & VETO)


def valid_values(item):
    values = item["values"]
    rank = values.get("AI Rank")
    return (values.get("AI Priority") in PRIORITIES and isinstance(rank, (int, float))
            and not isinstance(rank, bool) and math.isfinite(rank) and rank > 0
            and isinstance(values.get("AI Rationale"), str) and bool(values["AI Rationale"].strip()))


def select(issues, items, limit):
    by_number = {x["number"]: x for x in issues}
    candidates, seen = [], set()
    for item in items:
        if not own_issue(item) or item["isArchived"]:
            continue
        number = item["content"]["number"]
        issue = by_number.get(number)
        if issue is None:
            if item["content"]["state"] == "OPEN":
                raise RuntimeError(f"Open Project issue #{number} missing from issue inventory")
            continue
        if not ready(issue, prioritized=True):
            continue
        if not valid_values(item):
            raise RuntimeError(f"Incomplete/invalid prioritized Project fields on #{number}")
        rank = item["values"]["AI Rank"]
        if rank in seen:
            raise RuntimeError(f"Duplicate runnable rank: {rank}")
        seen.add(rank)
        candidates.append({"number": number, "url": issue["html_url"], "title": issue["title"],
                           **item["values"]})
    present = {x["content"]["number"] for x in items if own_issue(x) and not x["isArchived"]}
    missing = [x["number"] for x in issues if ready(x, prioritized=True) and x["number"] not in present]
    if missing:
        raise RuntimeError(f"Prioritized issues absent from active Project: {missing}")
    return sorted(candidates, key=lambda x: x["AI Rank"])[:limit]


def issues():
    return [x for x in pages(f"repos/{REPO}/issues?state=open&per_page=100") if "pull_request" not in x]


def project_views():
    connection = graphql('''query { user(login:"cormoran") { projectV2(number:3) {
      views(first:100) { pageInfo { hasNextPage } nodes { name number layout filter
        fields(first:100) { pageInfo { hasNextPage } nodes {
          ... on ProjectV2Field { name }
          ... on ProjectV2SingleSelectField { name }
          ... on ProjectV2IterationField { name }
        } }
        sortByFields(first:100) { pageInfo { hasNextPage } nodes { direction field {
          ... on ProjectV2Field { name }
          ... on ProjectV2SingleSelectField { name }
          ... on ProjectV2IterationField { name }
        } } }
      } }
    } } }''')["user"]["projectV2"]["views"]
    if connection["pageInfo"]["hasNextPage"]:
        raise RuntimeError("View inventory incomplete; no view mutations")
    return connection["nodes"]


def verify_view(view):
    if view["fields"]["pageInfo"]["hasNextPage"] or view["sortByFields"]["pageInfo"]["hasNextPage"]:
        raise RuntimeError("View field/sort inventory incomplete")
    expected_sort = [{"direction": "ASC", "field": {"name": "AI Rank"}}]
    if (view["layout"] != "TABLE_LAYOUT" or view["filter"] != VIEW_FILTER
            or {x["name"] for x in view["fields"]["nodes"]} != VIEW_FIELDS
            or view["sortByFields"]["nodes"] != expected_sort):
        raise RuntimeError("Existing AI view differs; preserve human configuration and resolve explicitly")
    return f"https://github.com/users/{OWNER}/projects/{PROJECT}/views/{view['number']}"


def setup_view():
    matches = [x for x in project_views() if x["name"] == VIEW_NAME]
    if len(matches) > 1:
        raise RuntimeError("Ambiguous AI queue views; no view mutations")
    if matches:
        return verify_view(matches[0])
    # REST create supports sorting, unlike the GraphQL view mutation. On the live
    # API the user path accepts login; field IDs here are REST integers, not node IDs.
    fields = pages(f"users/{OWNER}/projectsV2/{PROJECT}/fields?per_page=100")
    by_name = {x["name"]: x["id"] for x in fields}
    if not VIEW_FIELDS.issubset(by_name):
        raise RuntimeError("Missing visible view fields")
    gh("api", f"users/{OWNER}/projectsV2/{PROJECT}/views", "--method", "POST", "--input", "-",
       payload={"name": VIEW_NAME, "layout": "table", "filter": VIEW_FILTER,
                "visible_fields": [by_name[x] for x in sorted(VIEW_FIELDS)],
                "sort_by": [[by_name["AI Rank"], "asc"]]})
    matches = [x for x in project_views() if x["name"] == VIEW_NAME]
    if len(matches) != 1:
        raise RuntimeError("View creation readback failed; reconcile before retry")
    return verify_view(matches[0])


def setup(labels_only):
    existing = {x["name"] for x in pages(f"repos/{REPO}/labels?per_page=100")}
    for name, (color, description) in LABELS.items():
        if name not in existing:
            gh("api", f"repos/{REPO}/labels", "--method", "POST", "--input", "-",
               payload={"name": name, "color": color, "description": description})
    verified = {x["name"] for x in pages(f"repos/{REPO}/labels?per_page=100")}
    if not set(LABELS).issubset(verified):
        raise RuntimeError("Label creation readback failed")
    if labels_only:
        return {"labels": sorted(LABELS), "project": "not configured"}
    fields = field_map(project_info(), required=False)
    for name, kind in FIELDS.items():
        if name not in fields:
            args = ["project", "field-create", PROJECT, "--owner", OWNER,
                    "--name", name, "--data-type", kind, "--format", "json"]
            if kind == "SINGLE_SELECT":
                args += ["--single-select-options", "P0,P1,P2,P3"]
            gh(*args)
    info = project_info()
    field_map(info)
    return {"labels": sorted(LABELS), "project": info["url"], "fields": list(FIELDS),
            "queue_view": setup_view(), "existing_views_and_workflows": "unchanged"}


def prioritize(number, priority, rank, reason):
    if not math.isfinite(rank) or rank <= 0 or not reason.strip():
        raise RuntimeError("Rank must be positive/finite and rationale nonempty")
    issue = gh("api", f"repos/{REPO}/issues/{number}")
    if "pull_request" in issue or not ready(issue):
        raise RuntimeError("Issue is not triaged, nominated, open and free of veto/claim labels")
    info, items = project_items()
    matches = [x for x in items if own_issue(x) and not x["isArchived"] and x["content"]["number"] == number]
    if len(matches) != 1:
        raise RuntimeError("Issue sync pending or Project item ambiguous; no mutations made")
    item = matches[0]
    expected = {"AI Priority": priority, "AI Rank": rank, "AI Rationale": reason}
    for name, old in item["values"].items():
        if old != expected[name]:
            raise RuntimeError(f"Preserve existing {name}: {old!r}; explicit human change needed")
    for other in items:
        if own_issue(other) and not other["isArchived"] and other["id"] != item["id"]:
            if other["values"].get("AI Rank") == rank:
                raise RuntimeError("Rank already occupied; choose an unused gap")
    fields = field_map(info)
    for name, value in expected.items():
        args = ["project", "item-edit", "--id", item["id"], "--project-id", info["id"],
                "--field-id", fields[name]["id"], "--format", "json"]
        if name == "AI Priority":
            options = [x["id"] for x in fields[name]["options"] if x["name"] == value]
            if len(options) != 1:
                raise RuntimeError("Priority option ambiguous")
            args += ["--single-select-option-id", options[0]]
        else:
            args += ["--number" if name == "AI Rank" else "--text", str(value)]
        gh(*args)
    _, fresh = project_items()
    if next(x for x in fresh if x["id"] == item["id"])["values"] != expected:
        raise RuntimeError("Project field readback mismatch; prioritized marker NOT written")
    if not ready(gh("api", f"repos/{REPO}/issues/{number}")):
        raise RuntimeError("Issue gates changed during priority writes; marker NOT written")
    gh("api", f"repos/{REPO}/issues/{number}/labels", "--method", "POST", "--input", "-",
       payload={"labels": ["ai:prioritized"]})
    if "ai:prioritized" not in names(gh("api", f"repos/{REPO}/issues/{number}")):
        raise RuntimeError("Prioritized marker readback failed")
    return {"number": number, "project": info["url"], **expected}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    config = sub.add_parser("setup")
    config.add_argument("--labels-only", action="store_true")
    sub.add_parser("snapshot")
    choose = sub.add_parser("select")
    choose.add_argument("--limit", type=int, default=5)
    rank = sub.add_parser("prioritize")
    rank.add_argument("issue", type=int)
    rank.add_argument("--priority", choices=sorted(PRIORITIES), required=True)
    rank.add_argument("--rank", type=float, required=True)
    rank.add_argument("--reason", required=True)
    args = parser.parse_args()
    if args.command == "setup":
        output = setup(args.labels_only)
    elif args.command == "prioritize":
        output = prioritize(args.issue, args.priority, args.rank, args.reason)
    elif args.command == "select":
        if args.limit < 1 or args.limit > 20:
            raise RuntimeError("Selection limit must be 1..20; execution budget is coordinator-owned")
        _, items = project_items()
        output = select(issues(), items, args.limit)
    else:
        info, items = project_items()
        inventory = issues()
        for issue in inventory:
            number = issue["number"]
            issue["all_comments"] = pages(f"repos/{REPO}/issues/{number}/comments?per_page=100")
            issue["timeline"] = pages(f"repos/{REPO}/issues/{number}/timeline?per_page=100")
        output = {"repository": REPO, "project": info, "items": items, "issues": inventory,
                  "open_prs": pages(f"repos/{REPO}/pulls?state=open&per_page=100")}
    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, KeyError, ValueError, TypeError) as error:
        print(f"queue: {error}", file=sys.stderr)
        sys.exit(1)
