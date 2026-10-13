"""Exercise queue safety and mutation boundaries without touching GitHub."""
import copy
import unittest
from unittest.mock import patch

# Avoid Python's standard-library queue module when this file is discovered elsewhere.
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location("issue_queue", Path(__file__).with_name("queue.py"))
q = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q)


def issue(number=1, labels=None):
    return {"number": number, "state": "open", "title": "Test", "html_url": f"https://github.com/{q.REPO}/issues/{number}",
            "labels": [{"name": x} for x in (labels if labels is not None else q.REQUIRED | {"ai:prioritized"})]}


def item(number=1, rank=1):
    return {"id": f"item-{number}", "isArchived": False,
            "content": {"__typename": "Issue", "number": number, "state": "OPEN", "repository": {"nameWithOwner": q.REPO}},
            "values": {"AI Priority": "P1", "AI Rank": rank, "AI Rationale": "Reproduced core workflow failure"}}


def info():
    return {"id": "project-id", "url": "https://github.com/users/cormoran/projects/3", "fields": {"nodes": [
        {"id": name, "name": name, "dataType": kind,
         "options": [{"id": x, "name": x} for x in sorted(q.PRIORITIES)]}
        for name, kind in q.FIELDS.items()]}}


class QueueTests(unittest.TestCase):
    def test_rank_order_fractional_and_limit(self):
        result = q.select([issue(1), issue(2)], [item(1, 10), item(2, 0.5)], 1)
        self.assertEqual([x["number"] for x in result], [2])

    def test_each_veto_overrides_nomination(self):
        for veto in q.VETO:
            with self.subTest(veto=veto):
                candidate = issue(labels=q.REQUIRED | {"ai:prioritized", veto})
                self.assertEqual(q.select([candidate], [item()], 5), [])
                self.assertIn("ai:implement", q.names(candidate))

    def test_marker_without_project_values_fails_closed(self):
        for value in [None, 0, float("nan"), float("inf"), True]:
            with self.subTest(rank=value), self.assertRaises(RuntimeError):
                q.select([issue()], [item(rank=value)], 5)

    def test_duplicate_rank_fails_before_selection(self):
        with self.assertRaises(RuntimeError):
            q.select([issue(1), issue(2)], [item(1), item(2)], 1)

    def test_prioritized_missing_or_archived_item_is_error(self):
        for entries in [[], [{**item(), "isArchived": True}]]:
            with self.assertRaises(RuntimeError):
                q.select([issue()], entries, 5)

    def test_foreign_repo_item_is_never_selected(self):
        foreign = item(2)
        foreign["content"]["repository"]["nameWithOwner"] = "someone/other"
        self.assertEqual(q.select([issue()], [foreign, item()], 5)[0]["number"], 1)

    def test_existing_human_priority_is_not_overwritten(self):
        with patch.object(q, "gh", return_value=issue()) as api, patch.object(q, "project_items", return_value=(info(), [item()])):
            with self.assertRaisesRegex(RuntimeError, "Preserve existing"):
                q.prioritize(1, "P0", 1, "Different decision")
            self.assertEqual(api.call_count, 1)  # Read only, no mutation.

    def test_field_write_failure_never_adds_marker(self):
        blank = item()
        blank["values"] = {}
        calls = []

        def api(*args, **kwargs):
            calls.append(args)
            if args[0] == "api":
                return issue(labels=q.REQUIRED)
            raise RuntimeError("Write rejected")

        with patch.object(q, "gh", side_effect=api), patch.object(q, "project_items", return_value=(info(), [blank])):
            with self.assertRaisesRegex(RuntimeError, "Write rejected"):
                q.prioritize(1, "P1", 1, "Ready")
        self.assertFalse(any("/labels" in str(args) for args in calls))

    def test_failed_readback_never_adds_marker(self):
        blank = item()
        blank["values"] = {}
        with patch.object(q, "gh", return_value=issue(labels=q.REQUIRED)) as api, patch.object(q, "project_items", side_effect=[(info(), [blank]), (info(), [blank])]):
            with self.assertRaisesRegex(RuntimeError, "readback mismatch"):
                q.prioritize(1, "P1", 1, "Ready")
            self.assertFalse(any("/labels" in str(call.args) for call in api.call_args_list))

    def test_success_writes_marker_after_project_readback(self):
        blank = item()
        blank["values"] = {}
        final = item()
        events = []

        def inventory():
            events.append("project-read")
            return (info(), [blank if events.count("project-read") == 1 else final])

        def api(*args, **kwargs):
            if "/labels" in str(args):
                events.append("marker")
            return issue()

        with patch.object(q, "gh", side_effect=api), patch.object(q, "project_items", side_effect=inventory):
            q.prioritize(1, "P1", 1, final["values"]["AI Rationale"])
        self.assertEqual(events, ["project-read", "project-read", "marker"])

    def test_incompatible_fields_are_not_replaced(self):
        current = copy.deepcopy(info())
        current["fields"]["nodes"][0]["dataType"] = "TEXT"
        with self.assertRaisesRegex(RuntimeError, "Incompatible"):
            q.field_map(current, required=False)

    def test_existing_view_is_verified_without_mutation(self):
        view = {"name": q.VIEW_NAME, "number": 2, "layout": "TABLE_LAYOUT", "filter": q.VIEW_FILTER,
                "fields": {"pageInfo": {"hasNextPage": False}, "nodes": [{"name": x} for x in q.VIEW_FIELDS]},
                "sortByFields": {"pageInfo": {"hasNextPage": False}, "nodes": [{"direction": "ASC", "field": {"name": "AI Rank"}}]}}
        with patch.object(q, "project_views", return_value=[view]), patch.object(q, "gh") as api:
            self.assertTrue(q.setup_view().endswith("/views/2"))
            api.assert_not_called()

    def test_human_modified_sort_is_preserved(self):
        view = {"name": q.VIEW_NAME, "number": 2, "layout": "TABLE_LAYOUT", "filter": q.VIEW_FILTER,
                "fields": {"pageInfo": {"hasNextPage": False}, "nodes": [{"name": x} for x in q.VIEW_FIELDS]},
                "sortByFields": {"pageInfo": {"hasNextPage": False}, "nodes": [{"direction": "DESC", "field": {"name": "AI Rank"}}]}}
        with patch.object(q, "project_views", return_value=[view]), patch.object(q, "gh") as api:
            with self.assertRaisesRegex(RuntimeError, "preserve human"):
                q.setup_view()
            api.assert_not_called()

    def test_failed_view_readback_does_not_retry_create(self):
        fields = [{"name": name, "id": n} for n, name in enumerate(q.VIEW_FIELDS, 1)]
        with patch.object(q, "project_views", side_effect=[[], []]), patch.object(q, "pages", return_value=fields), patch.object(q, "gh") as api:
            with self.assertRaisesRegex(RuntimeError, "readback failed"):
                q.setup_view()
            self.assertEqual(api.call_count, 1)

    def test_setup_repeated_has_no_mutations(self):
        labels = [{"name": x} for x in q.LABELS]
        with patch.object(q, "pages", return_value=labels), patch.object(q, "project_info", return_value=info()), patch.object(q, "setup_view", return_value="view-url"), patch.object(q, "gh") as api:
            q.setup(False)
            q.setup(False)
            api.assert_not_called()


if __name__ == "__main__":
    unittest.main()
