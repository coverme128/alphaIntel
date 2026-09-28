# Unified Opportunity Feed v1.0.3

## Purpose

All enabled and eligible Alpha modules publish canonical opportunities into one `For You` feed. The user should not have to browse Funding, Basis, Structured or Options screens to discover actionable opportunities.

## Ranking stages

1. remove stale/blocked/unqualified opportunities;
2. remove module/allocation-ineligible opportunities;
3. apply owner risk and capital constraints;
4. compute deterministic allocation score;
5. de-duplicate economically equivalent or highly correlated candidates;
6. show the top actionable set plus explicit reasons for rejected candidates.

## Default card

Required fields:

- module / strategy;
- asset and venue(s);
- expected holding-period net return;
- capacity;
- recommended owner allocation;
- risk level + top risk flag;
- expected holding time/window;
- execution mode available now;
- freshness;
- CTA: `Inspect`, `Paper`, `Build Plan`, or `Execute` according to gates.

APR/annualized equivalents are secondary context only.

## User burden rule

Default Today view SHOULD show at most 3 primary actionable recommendations. Additional qualified candidates remain available under `View all`. No-op/cash is a valid top recommendation.
