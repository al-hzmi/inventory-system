#!/usr/bin/env python3
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

import inventory_analytics as ia


def run(repo, *args):
    subprocess.run(["git", "-C", repo, *args], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def inventory(prefix, base=100, n=60):
    rows = ["رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد"]
    for i in range(n):
        rows.append(f"{prefix}{i:03d}\tItem {prefix}{i}\tكرتون\t{base+i}\t12")
    return "\n".join(rows) + "\n"


class InventoryAnalyticsIncidentGuardTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        Path(self.repo, "data").mkdir()
        run(self.repo, "init", "-q")
        run(self.repo, "config", "user.email", "qa@example.com")
        run(self.repo, "config", "user.name", "Inventory Analytics QA")
        Path(self.repo, "data/jeddah.tsv").write_text(inventory("J"), encoding="utf-8")
        Path(self.repo, "data/riyadh.tsv").write_text(inventory("R", 200), encoding="utf-8")
        Path(self.repo, "data/pricing.tsv").write_text("h\th\nh\th\n", encoding="utf-8")
        run(self.repo, "add", ".")
        run(self.repo, "commit", "-qm", "initial")

    def tearDown(self):
        self.tmp.cleanup()

    def commit(self, message):
        run(self.repo, "add", "data/jeddah.tsv", "data/riyadh.tsv")
        run(self.repo, "commit", "-qm", message)
        return ia.run_git(self.repo, "rev-parse", "HEAD").strip()

    def test_normal_decrease_is_kept_but_clone_clear_restore_are_excluded(self):
        p = Path(self.repo, "data/riyadh.tsv")
        text = p.read_text(encoding="utf-8").replace(
            "R000\tItem R0\tكرتون\t200\t12",
            "R000\tItem R0\tكرتون\t195\t12",
        )
        p.write_text(text, encoding="utf-8")
        normal = self.commit("normal-sale")

        Path(self.repo, "data/riyadh.tsv").write_text(
            Path(self.repo, "data/jeddah.tsv").read_text(encoding="utf-8"), encoding="utf-8"
        )
        clone = self.commit("accidental-clone")

        Path(self.repo, "data/riyadh.tsv").write_text(
            "رقم الصنف\tاسم الصنف\tالوحدة\tالكمية المتوفرة\tالشد\n", encoding="utf-8"
        )
        clear = self.commit("accidental-clear")

        Path(self.repo, "data/riyadh.tsv").write_text(inventory("R", 200), encoding="utf-8")
        restore = self.commit("restore")

        raw = [ia.make_event(self.repo, sha) for sha in (normal, clone, clear, restore)]
        trusted, excluded = ia.classify_events(raw)
        self.assertEqual([e["message"] for e in trusted], ["normal-sale"])
        reasons = {e["message"]: e["exclusionType"] for e in excluded}
        self.assertEqual(reasons["accidental-clone"], "branch_clone")
        self.assertEqual(reasons["accidental-clear"], "branch_clear")
        self.assertEqual(reasons["restore"], "branch_restore")

    def test_confirmed_august_incident_commits_are_permanently_excluded(self):
        for commit, (kind, _) in ia.MANUAL_EXCLUSIONS.items():
            got_kind, reason, _ = ia.direct_exclusion({"commit": commit, "structure": {}})
            self.assertEqual(got_kind, kind)
            self.assertTrue(reason)


if __name__ == "__main__":
    unittest.main()
