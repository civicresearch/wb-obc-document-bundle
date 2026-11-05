/* Fetch only this page's data, in parallel, without blocking rendering. */
(async () => {
  const files = ['obc_documents.json', 'supplemental_documents.json', 'obc_classes.json', 'public_hearings.json', 'document_inventory.json', 'timeline_events.json', 'case_events.json'];
  const byPage = {
    home: files,
    timeline: ['timeline_events.json', 'supplemental_documents.json', 'obc_documents.json'],
    cases: ['case_events.json'],
    documents: ['obc_documents.json', 'supplemental_documents.json'],
    'obc-list': ['obc_classes.json', 'obc_documents.json'],
    evidence: ['public_hearings.json'],
    inventory: ['document_inventory.json']
  };
  const page = document.body.dataset.page;
  const needed = byPage[page] || (page ? [] : files);
  const data = window.OBC_INLINE_JSON || {};
  window.OBC_DATA_ERRORS = [];
  for (const file of files) if (!(file in data) && !needed.includes(file)) data[file] = file === 'obc_classes.json' ? {} : [];
  await Promise.all(needed.map(async file => {
    if (file in data) return;
    try {
      const response = await fetch(`${window.OBC_ASSET_BASE || ''}${file}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(String(response.status));
      data[file] = await response.json();
    } catch {
      data[file] = file === 'obc_classes.json' ? {} : [];
      window.OBC_DATA_ERRORS.push(file);
    }
  }));
  window.OBC_INLINE_JSON = data;
  const script = document.createElement('script');
  script.src = 'js/site.js?v=20261104-records';
  document.body.appendChild(script);
})();
