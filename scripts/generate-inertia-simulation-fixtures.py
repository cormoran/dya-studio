#!/usr/bin/env python3
"""Generate golden tick hashes from upstream PR #28 C functions.

Fetch src/pointing/input_processor_runtime.c at
7fa97aca3fefe4212c51a53c84f7caf889476086 and pass its local path:
  python3 scripts/generate-inertia-simulation-fixtures.py SOURCE.c OUTPUT.json
Host timing stubs process physical input before same-time scheduled output.
Only the positive single-axis example and default 64/66 Kconfig are modeled.
"""
import re, json, subprocess, hashlib, sys, tempfile, pathlib
source = pathlib.Path(sys.argv[1]).read_text()
expected_hash = '4a5f38eaea46333be39cbdda30220187b8419c482da3fd2d003b96af05e88ecf'
if hashlib.sha256(source.encode()).hexdigest() != expected_hash:
    raise SystemExit('Source does not match pinned PR #28 commit 7fa97aca')
temp = tempfile.TemporaryDirectory()
root = pathlib.Path(temp.name)

def func(name):
    m = re.search('(?:static )[^\\n]*\\b' + name + '\\(', source)
    start = m.start()
    brace = source.index('{', start)
    depth = 1
    end = brace + 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]
preamble = '\n#include <stdint.h>\n#include <stdbool.h>\n#include <stdio.h>\n#include <string.h>\n#include <limits.h>\n#include <stdlib.h>\n#define MIN(a,b) ((a)<(b)?(a):(b))\n#define MAX(a,b) ((a)>(b)?(a):(b))\n#define CLAMP(x,a,b) MIN(MAX(x,a),b)\n#define INERTIA_BUCKETS 66\n#define INERTIA_WINDOW_SLICES 64\n#define INERTIA_SPEED_FRACTION_BITS 16\n#define INERTIA_REVERSE_EXIT_MIN 3\n#define INERTIA_REVERSE_EXIT_MAX 24\n#define IS_ENABLED(x) 1\n#define INPUT_EV_REL 2\n#define K_MSEC(x) (x)\n#define LOG_DBG(...)\n#define raise_zmk_input_processor_inertia_state_changed(...) ((void)0)\n#define ZMK_INPUT_PROCESSOR_INERTIA_STOP_REASON_LAYER_INACTIVE 4\n#define ZMK_INPUT_PROCESSOR_INERTIA_STOP_REASON_SETTLED 1\n#define ZMK_INPUT_PROCESSOR_INERTIA_STOP_REASON_REVERSE_INPUT 3\nstruct inertia_trigger_state { int64_t bucket_number[66]; uint64_t bucket_q16[66]; int64_t last_report_ms; bool has_report; int8_t direction; };\nstruct input_event {int type, code, value;};\nstruct runtime_processor_data {\n void *dev; int inertia_work; uint32_t active_layers;\n uint16_t inertia_window_ms, inertia_interval_ms, inertia_threshold, inertia_normal_max_output, inertia_fast_threshold, inertia_fast_output_percent;\n uint8_t inertia_decay_percent; uint32_t scale_multiplier, scale_divisor;\n bool inertia_active, inertia_enabled, inertia_fast_active, inertia_received_input, inertia_notifications_enabled;\n uint8_t inertia_axis; int8_t inertia_direction; uint16_t inertia_output_code;\n uint64_t inertia_speed_q16, inertia_output_remainder; uint32_t inertia_scale_remainder; uint8_t inertia_fast_remainder;\n uint32_t inertia_reverse_amount; int64_t inertia_reverse_start;\n struct inertia_trigger_state inertia_trigger[2], inertia_scaled_trigger[2], inertia_measurement, inertia_scaled_measurement;\n};\nstatic int64_t clock_ms, tick_ms = INT64_MAX;\nstatic int64_t k_uptime_get(void) {return clock_ms;}\nstatic void k_work_reschedule(int *work, int delay) {tick_ms=clock_ms+delay;}\nstatic bool is_processor_active_for_current_layers(uint32_t layers) {return true;}\nstatic uint32_t input_value_magnitude(int value) {return abs(value);}\nstatic uint32_t saturating_add_amount(uint32_t a,uint32_t b){return UINT32_MAX-a<b?UINT32_MAX:a+b;}\nstatic void inertia_stop(struct runtime_processor_data *d,int reason) {\n d->inertia_active=false; d->inertia_fast_active=false; d->inertia_speed_q16=0;\n d->inertia_output_remainder=0; d->inertia_scale_remainder=0; d->inertia_fast_remainder=0;\n d->inertia_received_input=false;\n memset(d->inertia_trigger,0,sizeof d->inertia_trigger); memset(d->inertia_scaled_trigger,0,sizeof d->inertia_scaled_trigger);\n memset(&d->inertia_measurement,0,sizeof d->inertia_measurement); memset(&d->inertia_scaled_measurement,0,sizeof d->inertia_scaled_measurement);\n tick_ms=INT64_MAX;\n}\n'
main = '\nint main(int argc,char **argv) {\n struct runtime_processor_data d={.inertia_enabled=true,.inertia_window_ms=atoi(argv[1]),.inertia_interval_ms=atoi(argv[2]),.inertia_threshold=atoi(argv[3]),.inertia_decay_percent=atoi(argv[4]),.inertia_normal_max_output=atoi(argv[5]),.inertia_fast_threshold=atoi(argv[6]),.inertia_fast_output_percent=atoi(argv[7]),.scale_multiplier=atoi(argv[8]),.scale_divisor=atoi(argv[9])};\n int report_ms=20, index=0; uint32_t physical_remainder=0; int time,raw,scaled;\n while(scanf("%d %d %d",&time,&raw,&scaled)==3) {\n   while(tick_ms<time) {\n    clock_ms=tick_ms; bool fast=d.inertia_fast_active; int output=inertia_finish_interval(&d);\n    printf("%lld,%d,%d\\n",(long long)clock_ms,output,fast);\n    if(d.inertia_active) tick_ms=clock_ms+d.inertia_interval_ms;\n   }\n   clock_ms=time;\n   struct input_event event={.type=INPUT_EV_REL,.value=scaled};\n   inertia_handle_physical_event(&d,0,&event,raw);\n }\n while(tick_ms<=15000) {\n   clock_ms=tick_ms; bool fast=d.inertia_fast_active; int output=inertia_finish_interval(&d);\n   printf("%lld,%d,%d\\n",(long long)clock_ms,output,fast);\n   if(d.inertia_active) tick_ms=clock_ms+d.inertia_interval_ms;\n }\n}\n'
open(root / 'reference.c', 'w').write(preamble + '\n'.join((func(n) for n in ['inertia_bucket_ms', 'inertia_add_report', 'inertia_window_total_q16', 'inertia_raw_threshold', 'inertia_finish_interval', 'inertia_start', 'inertia_handle_physical_event'])) + main)
subprocess.run(['cc', '-w', str(root / 'reference.c'), '-o', str(root / 'reference')], check=True)
cases = [('default', 200, 20, 10, 8, 0, 20, 200, 1, 1), ('fractional-scale', 200, 20, 10, 8, 0, 20, 150, 2, 3), ('no-decay', 200, 20, 10, 0, 0, 20, 200, 1, 1), ('full-decay', 200, 20, 10, 100, 0, 20, 200, 1, 1), ('normal-limit', 200, 20, 10, 8, 3, 0, 200, 1, 1), ('one-ms', 1, 1, 1, 8, 3, 20, 150, 1, 1), ('long-interval', 200, 60000, 10, 8, 0, 20, 200, 1, 1)]
fixtures = []
for (name, *config) in cases:
    reports = []
    rem = 0
    (m, d) = config[-2:]
    for time in range(20, 5000, 20):
        raw = int(40 * (1 - ((time - 3200) / 3200) ** 2) + 0.5)
        num = raw * m + rem
        scaled = num // d
        rem = num - scaled * d
        reports.append([time, raw, scaled])
    output = subprocess.check_output([str(root / 'reference'), *map(str, config)], input=''.join(('%d %d %d\n' % tuple(r) for r in reports)).encode()).decode()
    ticks = [list(map(int, line.split(','))) for line in output.splitlines()]
    fixtures.append({'name': name, 'config': config, 'count': len(ticks), 'sum': sum((t[1] for t in ticks)), 'first': ticks[:5], 'last': ticks[-5:], 'hash': hashlib.sha256(json.dumps(ticks, separators=(',', ':')).encode()).hexdigest()})
open(sys.argv[2], 'w').write(json.dumps(fixtures, indent=2) + '\n')
print(json.dumps([{'name': f['name'], 'count': f['count'], 'first': f['first'][:2], 'last': f['last'][-1:]} for f in fixtures]))
temp.cleanup()
