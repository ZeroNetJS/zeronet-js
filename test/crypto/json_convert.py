#!/usr/bin/env python2.7

import json, sys

j = ""

for line in sys.stdin:
    j += line

sys.stdout.write(json.dumps(json.loads(j), sort_keys=True))
