"""
tests/test_eligibility.py — Unit tests for MSE eligibility rules and exact boundary conditions.

Eligibility rules:
  - Eligible:     percentage >= cutoff + margin (>= 60.0%)
  - At Risk:      cutoff <= percentage < cutoff + margin (55.0% <= pct < 60.0%)
  - Not Eligible: percentage < cutoff (< 55.0%)

Explicit boundary test targets:
  - 54.9% → Not Eligible
  - 55.0% → At Risk
  - 59.9% → At Risk
  - 60.0% → Eligible
"""

import pytest
from backend.services.analytics_service import get_eligibility_status


@pytest.mark.parametrize(
    "percentage,cutoff,margin,expected_status",
    [
        # Exact requested boundaries
        (54.9, 55.0, 5.0, "not_eligible"),
        (55.0, 55.0, 5.0, "at_risk"),
        (59.9, 55.0, 5.0, "at_risk"),
        (60.0, 55.0, 5.0, "eligible"),
        # Additional edge cases
        (0.0, 55.0, 5.0, "not_eligible"),
        (54.999, 55.0, 5.0, "not_eligible"),
        (55.001, 55.0, 5.0, "at_risk"),
        (59.999, 55.0, 5.0, "at_risk"),
        (60.001, 55.0, 5.0, "eligible"),
        (75.0, 55.0, 5.0, "eligible"),
        (100.0, 55.0, 5.0, "eligible"),
    ],
)
def test_eligibility_boundary_cases(percentage, cutoff, margin, expected_status):
    status = get_eligibility_status(
        attendance_pct=percentage,
        cutoff=cutoff,
        margin=margin,
    )
    assert status == expected_status, (
        f"Failed for {percentage}%: expected '{expected_status}', got '{status}'"
    )


def test_custom_cutoff_and_margin():
    """Verify arbitrary custom thresholds configured by faculty."""
    # Cutoff = 65, Margin = 10 -> Eligible >= 75%, At Risk 65-74.9%, Not Eligible < 65%
    assert get_eligibility_status(64.9, cutoff=65.0, margin=10.0) == "not_eligible"
    assert get_eligibility_status(65.0, cutoff=65.0, margin=10.0) == "at_risk"
    assert get_eligibility_status(74.9, cutoff=65.0, margin=10.0) == "at_risk"
    assert get_eligibility_status(75.0, cutoff=65.0, margin=10.0) == "eligible"
