# Basseqat ads v5: one review page for four open items (15 Nov 2026)

Same shell, CSS and feedback script as `basseqat-ads-v4` (`scripts/build_page.py` imports v4's).
Header: «مفيش أي حاجة هتتغير في الإعلانات غير بعد موافقتك.» Nothing here touches an ad account:
every number and string was read, never written.

1. «بديل إعلان الغربة»: v4 concepts a, b, c re-shown unchanged (their files are referenced from
   `../basseqat-ads-v4/assets/`, carried along by publish-ops-page under `_up/`).
2. Text-only fixes on three LIVE Meta ads in act_1703447730646133, image unchanged:
   EG | C5-v2 infra-checklist (52553090806072), EG | C7 editorial-farafra (52553090851872),
   GCC | C8 departure (52553091092472, its AI image is replaced by the section 1 pick). The live
   text is in `copy/copy-deck.json` (`before`) with the minimum edits (`edits`, `headlineEdit`).
3. Google PMax 24003636613 (customer 3469606388): three text assets to replace and seven images
   to remove (four Google-generated 2026-10-04, three Google auto-edits of 2026-08-02).
4. AW's Phase-1 post designs 1 to 3 from campaignReviewDeliverables
   `basseqat-phase1-2026-10-client` v8 (all nine files looked at: no face, every palm photo
   labelled Siwi; none excluded). Full-size files stay on GCS; `assets/posts/` holds previews.

Decisions and comments: `adApprovalFeedback/basseqat-ads-v5/{decisions,comments}`, item keys
`concept-a..c`, `fix-c5`, `fix-c7`, `fix-c8`, `pmax-h-brochure`, `pmax-d-brochure`, `pmax-h-2021`,
`pmax-images`, `post-phase1`, `post-downpayment`, `post-apartment`, `apply-all`, comments also `general`.

```bash
python3 basseqat-ads-v5/scripts/lint_copy.py --basseqat "$BASSEQAT_REPO" --ref origin/main
python3 basseqat-ads-v5/scripts/build_page.py
scripts/ops.sh --cwd apps/client-portal node scripts/publish-ops-page.mjs --dir ../../basseqat-ads-v5 \
  --slug basseqat-ads-v5 --entry review.html --kind approval --client-id IWvO6Ct67XFWztaufyeT --reason "..."
scripts/ops.sh --cwd apps/client-portal node scripts/publish-ops-page.mjs --mint basseqat-ads-v5 --label "owner preview"
```

After the client decides, changes go out only through `meta-ad-execute` / `google-ad-execute`.
