import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))
import new_arrivals as arrivals


HEADER = "sku\tname\tunit\tqty\tpack\n"


class NewArrivalsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.repo = self.temp.name
        subprocess.run(["git", "init", "-q", self.repo], check=True)
        subprocess.run(["git", "-C", self.repo, "config", "user.email", "qa@example.com"], check=True)
        subprocess.run(["git", "-C", self.repo, "config", "user.name", "QA"], check=True)
        os.makedirs(os.path.join(self.repo, "data"))

    def tearDown(self):
        self.temp.cleanup()

    def commit(self, jeddah, riyadh, message, when):
        for name, rows in (("jeddah.tsv", jeddah), ("riyadh.tsv", riyadh)):
            with open(os.path.join(self.repo, "data", name), "w", encoding="utf-8") as handle:
                handle.write(HEADER + "".join(f"{sku}\t{name}\tpcs\t{qty}\t1\n" for sku, name, qty in rows))
        env = {**os.environ, "GIT_AUTHOR_DATE": when, "GIT_COMMITTER_DATE": when}
        subprocess.run(["git", "-C", self.repo, "add", "data"], check=True, env=env)
        subprocess.run(["git", "-C", self.repo, "commit", "-q", "-m", message], check=True, env=env)

    def test_first_seen_is_stable_across_updates_and_cross_branch_moves(self):
        baseline = [(f"S{i:03}", f"Legacy {i}", 10) for i in range(25)]
        self.commit(baseline, [], "baseline", "2026-07-01T09:00:00+00:00")
        with_new = baseline + [("NEW1", "New item", 5)]
        self.commit(with_new, [], "new sku", "2026-08-10T09:00:00+00:00")
        self.commit(with_new[:-1], [("NEW1", "New item", 5)], "move branch", "2026-08-15T09:00:00+00:00")
        payload = arrivals.build_payload(self.repo, now=datetime(2026, 8, 20, tzinfo=timezone.utc))
        self.assertEqual([x["sku"] for x in payload["items"]], ["NEW1"])
        self.assertTrue(payload["items"][0]["firstSeenAt"].startswith("2026-08-10"))
        self.assertEqual(payload["items"][0]["branches"][0]["id"], "riyadh")

    def test_baseline_and_expired_items_are_not_active(self):
        baseline = [(f"S{i:03}", f"Legacy {i}", 10) for i in range(25)]
        self.commit(baseline, [], "baseline", "2026-06-01T09:00:00+00:00")
        self.commit(baseline + [("OLDNEW", "Old new", 4)], [], "old arrival", "2026-06-15T09:00:00+00:00")
        payload = arrivals.build_payload(self.repo, now=datetime(2026, 8, 20, tzinfo=timezone.utc))
        self.assertEqual(payload["items"], [])
        self.assertTrue(payload["quality"]["baselineSeeded"])


if __name__ == "__main__":
    unittest.main()
