(() => {
  const tabs = [...document.querySelectorAll('.case-tabs a')];
  const views = [...document.querySelectorAll('.case-view')];
  const tabsBar = document.querySelector('.case-tabs');

  if (!tabsBar || !tabs.length || !views.length) return;

  const order = tabs
    .map(tab => tab.getAttribute('href'))
    .filter(Boolean)
    .map(href => href.replace(/^#/, ''));

  let currentId = order[0];


  const scrollTabsIntoPlace = () => {
    /* offsetTop is the bar's real document position, so the browser lands
       with the sticky tab bar exactly at viewport top. */
    const target = Math.max(0, tabsBar.offsetTop);
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  const makeControls = (view, index) => {
    const controls = document.createElement('div');
    controls.className = 'case-step-controls';

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'case-step-btn previous';
    previous.innerHTML = '<i class="fa-solid fa-arrow-left"></i><span>Previous</span>';

    if (index === 0) {
      previous.disabled = true;
      previous.setAttribute('aria-hidden', 'true');
    } else {
      previous.addEventListener('click', () => activate(order[index - 1]));
    }

    const progress = document.createElement('span');
    progress.className = 'case-step-progress';
    progress.textContent = `${String(index + 1).padStart(2, '0')} / ${String(order.length).padStart(2, '0')}`;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'case-step-btn next';
    next.innerHTML = index === order.length - 1
      ? '<span>Back to Overview</span><i class="fa-solid fa-rotate-left"></i>'
      : '<span>Next</span><i class="fa-solid fa-arrow-right"></i>';

    next.addEventListener('click', () => {
      activate(index === order.length - 1 ? order[0] : order[index + 1]);
    });

    controls.append(previous, progress, next);
    view.appendChild(controls);
  };

  const activate = (id, shouldScroll = true) => {
    const index = order.indexOf(id);
    if (index === -1) return;

    currentId = id;

    views.forEach(view => {
      const active = view.id === id;
      view.classList.toggle('active', active);
      view.hidden = !active;
      view.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    tabs.forEach(tab => {
      const active = tab.getAttribute('href') === `#${id}`;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    history.replaceState(null, '', `#${id}`);

    if (shouldScroll) {
      /* Changing a tab is a reading-mode transition. Put the tab bar at
         the top so the selected section starts immediately underneath it. */
      scrollTabsIntoPlace();
    }

  };

  /* Previous / Next belong to the main case-study sections only.
     Every main section gets the controls. The vulnerability sub-tabs are
     internal to the Vulnerabilities section and never get their own controls. */
  views.forEach((view, index) => makeControls(view, index));

  /* Vulnerability sub-tabs stay inside the Vulnerabilities section and
     switch findings without changing the main case-study progress. */
  const vulnerabilityTabs = [...document.querySelectorAll('.vulnerability-tab')];
  const sideLinks = [...document.querySelectorAll('.side-link')];
  const vulnerabilityData = {
    sql: {
      number: 'VULNERABILITY 01', title: 'SQL Injection', severity: 'HIGH SEVERITY', severityClass: 'severity-high',
      description: 'The search endpoint accepted user-controlled input in a way that could change the SQL query instead of being treated only as search text.',
      endpoint: '/search', parameter: 'q', type: 'SQL Injection', severityValue: 'High',
      details: {
        overview: 'I tested the search endpoint with normal input first, then changed the q parameter to a SQL payload to see whether the database query could be changed.',
        details: 'The vulnerable search flow used user input inside an unsafe SQL statement. The test showed that the q parameter could affect the query logic.',
        poc: "The normal search for Network returned 1 result. I then changed q to ' OR '1'='1' -- and the application returned 3 results.",
        result: 'The search result changed from 1 record to 3 records after the SQL payload was supplied, showing that the input affected the underlying query.',
        mitigation: 'Use parameterized queries so the q value is always handled as data. Validate input where appropriate and keep database permissions as limited as possible.'
      },
      evidence: {
        details: `
          <div class="evidence-code-card"><span class="evidence-label">REQUEST</span><pre>GET /search?q=%27+OR+%271%27%3D%271%27+-- HTTP/2</pre></div>
          <div class="evidence-note"><i class="fa-solid fa-circle-info"></i><span><b>Decoded payload:</b> ' OR '1'='1' --</span></div>`,
        poc: `
          <div class="evidence-code-card"><span class="evidence-label">TEST PAYLOAD</span><pre>' OR '1'='1' --</pre></div>
          <div class="evidence-grid two">
            <figure class="evidence-shot"><img src="assets/evidence/sql-normal.png" alt="Normal search returning one result"><figcaption>Normal search — <b>1 FOUND</b></figcaption></figure>
            <figure class="evidence-shot"><img src="assets/evidence/sql-injection.png" alt="SQL injection search returning three results"><figcaption>Injected search — <b>3 FOUND</b></figcaption></figure>
          </div>`,
        result: `
          <div class="result-metrics">
            <div><strong>1</strong><span>normal results</span></div>
            <div class="result-arrow"><i class="fa-solid fa-arrow-right"></i></div>
            <div class="result-metric-danger"><strong>3</strong><span>after injection</span></div>
          </div>
          <div class="evidence-note"><i class="fa-solid fa-triangle-exclamation"></i><span>The injected condition changed the search behavior and returned records outside the original search term.</span></div>`,
        mitigation: `
          <div class="before-after-code">
            <div><span class="evidence-label">INSECURE</span><pre>SQL string + raw q input\n        ↓\nDatabase query</pre></div>
            <div><span class="evidence-label safe">SECURE</span><pre>Parameterized query\n        ↓\nDatabase query</pre></div>
          </div>`
      }
    },
    idor: {
      number: 'VULNERABILITY 02', title: 'Broken Access Control / IDOR', severity: 'HIGH SEVERITY', severityClass: 'severity-high',
      description: 'The profile endpoint trusted a user-controlled identifier instead of checking whether the logged-in client was allowed to access that profile.',
      endpoint: '/profile', parameter: 'id', type: 'Broken Access Control / IDOR', severityValue: 'High',
      details: {
        overview: 'I logged in as a normal client and tested whether changing the profile ID would let me read another account.',
        details: 'The server trusted the id supplied in the URL without enforcing an ownership or role check for the requested profile.',
        poc: 'My client session first accessed /profile?id=2. I then changed only the id parameter to 1 and the application returned the administrator profile.',
        result: 'A normal authenticated client could access another user record, including the administrator profile, by changing a single identifier.',
        mitigation: 'Check authorization on the server for every requested object. The logged-in user must be allowed to access the specific profile before the record is returned.'
      },
      evidence: {
        details: `
          <div class="evidence-code-card"><span class="evidence-label">ORIGINAL REQUEST</span><pre>GET /profile?id=2 HTTP/2</pre></div>
          <div class="evidence-code-card"><span class="evidence-label">MODIFIED REQUEST</span><pre>GET /profile?id=1 HTTP/2</pre></div>`,
        poc: `
          <div class="evidence-grid two">
            <figure class="evidence-shot"><img src="assets/evidence/idor-request-own.png" alt="Burp request for the client's own profile"><figcaption>Original request — <b>/profile?id=2</b></figcaption></figure>
            <figure class="evidence-shot"><img src="assets/evidence/idor-request-admin.png" alt="Burp request with the profile ID changed to one"><figcaption>Modified request — <b>/profile?id=1</b></figcaption></figure>
            <figure class="evidence-shot"><img src="assets/evidence/idor-client.png" alt="Client profile response"><figcaption>Client profile — User ID <b>#2</b></figcaption></figure>
            <figure class="evidence-shot"><img src="assets/evidence/idor-admin.png" alt="Administrator profile returned by the modified ID"><figcaption>Unauthorized result — Admin User ID <b>#1</b></figcaption></figure>
          </div>`,
        result: `
          <div class="result-flow"><span>Client session</span><i class="fa-solid fa-arrow-right"></i><span>/profile?id=1</span><i class="fa-solid fa-arrow-right"></i><strong>Admin profile returned</strong></div>
          <div class="evidence-note"><i class="fa-solid fa-user-shield"></i><span>The session remained the normal client session; only the object identifier changed.</span></div>`,
        mitigation: `
          <div class="before-after-code">
            <div><span class="evidence-label">VULNERABLE</span><pre>Trust client-supplied id\n        ↓\nReturn profile</pre></div>
            <div><span class="evidence-label safe">SECURE</span><pre>Check session + ownership\n        ↓\nReturn only if allowed</pre></div>
          </div>`
      }
    },
    brute: {
      number: 'VULNERABILITY 03', title: 'Login Brute Force', severity: 'MEDIUM SEVERITY', severityClass: 'severity-medium',
      description: 'The login endpoint was tested with repeated automated authentication requests. The lab then triggered its rate-limiting response after repeated failures.',
      endpoint: '/login', parameter: 'username / password', type: 'Brute Force', severityValue: 'Medium',
      details: {
        overview: 'I used Hydra with a small controlled wordlist to test how the login endpoint handled repeated failed authentication attempts.',
        details: 'The application accepted the first failed attempts and then changed its response after the failed-attempt threshold was reached.',
        poc: 'Hydra sent seven controlled login attempts. The test then triggered the application rate-limit response, which returned HTTP 429.',
        result: 'The application rate-limited the source after repeated failures. Hydra also produced a false positive while the response state had changed, so that result was manually rejected.',
        mitigation: 'Keep rate limiting enabled, log failed authentication attempts, apply sensible lockout controls and make automated response states unambiguous to monitoring tools.'
      },
      evidence: {
        details: `
          <div class="evidence-code-card"><span class="evidence-label">HYDRA TEST</span><pre>hydra -l alex -P rate-test.txt -t 1 -V \\\nhttps-post-form \\\n'/login:username=^USER^&password=^PASS^:S=href="/profile"'</pre></div>`,
        poc: `
          <div class="evidence-grid two">
            <figure class="evidence-shot"><img src="assets/evidence/brute-hydra.png" alt="Hydra controlled brute force test"><figcaption>Hydra — controlled login attempts</figcaption></figure>
            <figure class="evidence-shot"><img src="assets/evidence/brute-429.png" alt="Terminal showing HTTP 429 after rate limiting"><figcaption>Rate limit triggered — <b>HTTP/2 429</b></figcaption></figure>
          </div>`,
        result: `
          <div class="result-flow"><span>Repeated failures</span><i class="fa-solid fa-arrow-right"></i><span>Threshold reached</span><i class="fa-solid fa-arrow-right"></i><strong>HTTP 429</strong></div>
          <div class="evidence-note warning"><i class="fa-solid fa-triangle-exclamation"></i><span>Hydra reported a false positive after the application's response changed. The credential was manually validated and was not treated as valid.</span></div>`,
        mitigation: `
          <div class="mitigation-grid"><article><i class="fa-solid fa-stopwatch"></i><h5>Rate limit</h5><p>Limit repeated authentication attempts from the same source.</p></article><article><i class="fa-solid fa-list-check"></i><h5>Log failures</h5><p>Record failed attempts so the activity can be detected and reviewed.</p></article><article><i class="fa-solid fa-user-lock"></i><h5>Protect accounts</h5><p>Use sensible lockout and authentication controls alongside rate limiting.</p></article></div>`
      }
    },
    admin: {
      number: 'VULNERABILITY 04', title: 'Admin Access Control', severity: 'HIGH SEVERITY', severityClass: 'severity-high',
      description: 'The /admin route did not enforce an administrator authorization check, allowing a normal authenticated session to reach the administrative panel.',
      endpoint: '/admin', parameter: 'session / route', type: 'Missing Access Control', severityValue: 'High',
      details: {
        overview: 'I checked whether the admin-only route enforced authorization on the server while using a normal client session.',
        details: 'The route returned the administrative panel without checking whether the current authenticated user had administrator privileges.',
        poc: 'Using the existing normal-user session, I requested GET /admin. The response rendered the Admin Panel and its administrative functions.',
        result: 'A normal authenticated user could access a privileged area directly because the server did not enforce the required role check.',
        mitigation: 'Check the authenticated user role on the server before every admin page and action. Do not rely on hiding navigation links as access control.'
      },
      evidence: {
        details: `
          <div class="evidence-code-card"><span class="evidence-label">REQUEST</span><pre>GET /admin HTTP/2</pre></div>
          <div class="evidence-note"><i class="fa-solid fa-user"></i><span>The request used the existing normal-user session.</span></div>`,
        poc: `
          <div class="evidence-grid two">
            <figure class="evidence-shot"><img src="assets/evidence/admin-request.png" alt="Burp request to the admin route"><figcaption>Normal-user session requesting <b>/admin</b></figcaption></figure>
            <figure class="evidence-shot"><img src="assets/evidence/admin-response.png" alt="Admin panel returned without access control"><figcaption>Admin panel returned — no authorization check</figcaption></figure>
          </div>`,
        result: `
          <div class="result-metrics three"><div><strong>GET</strong><span>/admin</span></div><div><strong>200</strong><span>admin panel returned</span></div><div class="result-metric-danger"><strong>NO</strong><span>role check</span></div></div>
          <div class="evidence-note"><i class="fa-solid fa-circle-exclamation"></i><span>The application itself displayed: “this panel has no access control at all — anyone can open it.”</span></div>`,
        mitigation: `
          <div class="before-after-code">
            <div><span class="evidence-label">VULNERABLE</span><pre>GET /admin\n        ↓\nRender admin panel</pre></div>
            <div><span class="evidence-label safe">SECURE</span><pre>GET /admin\n        ↓\nCheck user role\n        ↓\nAllow / deny</pre></div>
          </div>`
      }
    }
  };

  const detailText = document.getElementById('vulnerabilityDetailText');
  const detailLabel = document.querySelector('.detail-label');
  const vulnerabilityContent = document.querySelector('.vulnerability-content');
  const vulnerabilityInfoGrid = document.querySelector('.vulnerability-info-grid');
  const vulnerabilityDetailArea = document.getElementById('vulnerabilityDetailArea');
  const vulnerabilityDetailHead = document.getElementById('vulnerabilityDetailHead');
  const vulnerabilityDetailMeta = document.getElementById('vulnerabilityDetailMeta');
  const vulnerabilityEvidence = document.getElementById('vulnerabilityEvidence');

  const sideContent = {
    overview: { kicker: 'OVERVIEW', titleMode: 'finding', showOverview: true, label: 'OVERVIEW' },
    details: { kicker: 'VULNERABILITY DETAILS', title: 'Vulnerability Details', label: 'TECHNICAL DETAILS', showOverview: false },
    poc: { kicker: 'PROOF OF CONCEPT', title: 'Proof of Concept', label: 'TEST / EVIDENCE', showOverview: false },
    result: { kicker: 'RESULT', title: 'Result', label: 'OBSERVED RESULT', showOverview: false },
    mitigation: { kicker: 'MITIGATION', title: 'Mitigation', label: 'RECOMMENDED FIX', showOverview: false }
  };

  const updateSideContent = (data, key) => {
    const config = sideContent[key] || sideContent.overview;
    const isOverview = config.showOverview;
    vulnerabilityContent.classList.toggle('is-detail-view', !isOverview);
    vulnerabilityInfoGrid.hidden = !isOverview;
    vulnerabilityDetailArea.classList.toggle('expanded', !isOverview);

    document.getElementById('vulnerabilityKicker').textContent = config.kicker;
    document.getElementById('vulnerabilityContentTitle').textContent = isOverview ? data.title : config.title;
    const vulnerabilityDescription = document.getElementById('vulnerabilityDescription');
    vulnerabilityDescription.hidden = !isOverview;
    vulnerabilityDescription.textContent = data.description;
    detailLabel.textContent = config.label;
    detailText.textContent = data.details[key] || data.details.overview;
    if (vulnerabilityEvidence) {
      vulnerabilityEvidence.innerHTML = isOverview ? '' : (data.evidence?.[key] || '');
      vulnerabilityEvidence.hidden = isOverview;
    }

    if (vulnerabilityDetailHead) {
      vulnerabilityDetailHead.textContent = isOverview ? 'Overview' : config.title;
    }
    if (vulnerabilityDetailMeta) {
      vulnerabilityDetailMeta.textContent = isOverview
        ? 'Finding summary'
        : (key === 'poc' ? 'Controlled lab evidence' : key === 'result' ? 'What the test showed' : key === 'mitigation' ? 'How I would fix it' : 'Technical finding');
    }
  };

  const switchVulnerability = (key, detailKey = 'overview') => {
    const data = vulnerabilityData[key];
    if (!data) return;
    vulnerabilityTabs.forEach(tab => {
      const active = tab.dataset.vulnerability === key;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.getElementById('vulnerabilityNumber').textContent = data.number;
    document.getElementById('vulnerabilityTitle').textContent = data.title;
    const badge = document.getElementById('vulnerabilitySeverity');
    badge.className = `vulnerability-severity ${data.severityClass}`;
    badge.innerHTML = `<i class="fa-solid fa-circle"></i> ${data.severity}`;
    document.getElementById('vulnerabilityEndpoint').textContent = data.endpoint;
    document.getElementById('vulnerabilityParameter').textContent = data.parameter;
    document.getElementById('vulnerabilityType').textContent = data.type;
    const severityValue = document.getElementById('vulnerabilitySeverityValue');
    severityValue.textContent = data.severityValue;
    severityValue.className = data.severityClass === 'severity-medium' ? 'severity-value-medium' : 'severity-value-high';

    const selectedDetail = sideContent[detailKey] ? detailKey : 'overview';
    sideLinks.forEach(link => link.classList.toggle('active', link.dataset.detail === selectedDetail));
    updateSideContent(data, selectedDetail);
  };

  vulnerabilityTabs.forEach(tab => tab.addEventListener('click', () => switchVulnerability(tab.dataset.vulnerability, 'overview')));
  sideLinks.forEach(link => link.addEventListener('click', () => {
    const activeTab = vulnerabilityTabs.find(tab => tab.classList.contains('active'));
    const key = link.dataset.detail;
    switchVulnerability(activeTab?.dataset.vulnerability || 'sql', key);
  }));

  switchVulnerability('sql');

  tabs.forEach(tab => {
    tab.addEventListener('click', event => {
      event.preventDefault();
      const id = tab.getAttribute('href').replace(/^#/, '');
      activate(id);
    });
  });

  const explore = document.querySelector('.case-secondary');
  if (explore) {
    explore.addEventListener('click', event => {
      event.preventDefault();
      activate('overview');
    });
  }

  const initialHash = location.hash.replace(/^#/, '');
  activate(order.includes(initialHash) ? initialHash : order[0], Boolean(initialHash));

})();
