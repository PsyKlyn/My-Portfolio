const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const menuBtn = $("#menuBtn");
const navLinks = $("#navLinks");
menuBtn?.addEventListener("click", () => navLinks.classList.toggle("open"));
$$(".nav-links a").forEach(a => a.addEventListener("click", () => navLinks.classList.remove("open")));

const grid = $("#writeupGrid");
const search = $("#search");
const filters = $("#filters");
const empty = $("#empty");
const showMore = $(".show-more-btn");
let LIVE_HOME_WRITEUPS = null;

function slugifyWriteup(value) {
  return String(value || "").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


function getPublishedWriteups() {
  try {
    const items = JSON.parse(localStorage.getItem("sardhon-published-writeups-v1") || "[]");
    return Array.isArray(items) ? items.map(w => {
      const slug = w.slug || w.id || slugifyWriteup(w.title);
      return {...w, slug, url:`writeups.html?slug=${encodeURIComponent(slug)}`, published:true};
    }) : [];
  } catch { return []; }
}

function normalizeHomeTags(tags){
  const raw=Array.isArray(tags)?tags:String(tags||"").split(",");
  const seen=new Set(), out=[];
  for(const value of raw){
    const display=String(value||"").trim();
    const key=display.toLowerCase();
    if(!key||seen.has(key)) continue;
    seen.add(key); out.push(display);
  }
  return out;
}

// Write-up artwork resolver. Published entries from older versions may not
// have a logo/attackType saved yet, so the catalogue derives the correct
// attack-chain image from metadata before falling back to one of the six
// default covers. Explicitly uploaded logos always take precedence.
const HOME_ATTACK_LOGO_BASE = "assets/writeup-logos/attack-chain/";
const HOME_DEFAULT_LOGO_BASE = "assets/writeup-logos/defaults/";
const HOME_ATTACK_IMAGE_MAP = {
  SQLINJECTION:"SQL.PNG", IDOR:"IDOR.PNG", XSS:"XSS.PNG", CSRF:"CSRF.PNG",
  SSRF:"SSRF.PNG", RCE:"RCE.PNG", LFI:"LFI.PNG", RFI:"RFI.PNG",
  PATHTRAVERSAL:"PATHTRAVERSAL.PNG", COMMANDINJECTION:"COMMANDINJECTION.PNG",
  BROKENAUTHENTICATION:"BROKENAUTHENTICATION.PNG", BROKENACCESSCONTROL:"BROKENACCESSCONTROL.PNG",
  SENSITIVEINFOEXPOSURE:"SENSITIVEINFOEXPOSURE.PNG", SECURITYMISCONFIGURATION:"SECURITYMISCONFIGURATION.PNG",
  INSECUREDESIGN:"INSECUREDESIGN.PNG"
};
const HOME_DEFAULT_LOGOS = [1,2,3,4,5].map(n=>`${HOME_DEFAULT_LOGO_BASE}DEFAULT_${n}.PNG`);
function normalizeHomeAttack(value){
  return String(value||"").trim().toUpperCase().replace(/[^A-Z0-9]+/g,"");
}
function firstHomeAttackType(item){
  const explicit=String(item?.attackType||"").split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean)[0];
  if(explicit) return explicit;
  // Backward compatibility for the original static write-ups.
  const hay=`${item?.title||""} ${item?.category||""} ${(item?.tags||[]).join(" ")} ${item?.excerpt||""}`.toUpperCase();
  if(/\bSQL\s*INJECTION\b/.test(hay)) return "SQLINJECTION";
  if(/\bIDOR\b/.test(hay)) return "IDOR";
  return "";
}
function resolveHomeWriteupLogo(item,index=0){
  const explicit=String(item?.logo||"").trim();
  const explicitDefault=/(^|\/)assets\/writeup-logos\/defaults\/DEFAULT_[1-5]\.PNG$/i.test(explicit) || /(^|\/)writeup-logos\/defaults\/DEFAULT_[1-5]\.PNG$/i.test(explicit) || /(^|\/)DEFAULT_[1-5]\.PNG$/i.test(explicit);

  // Uploaded/custom logos always win. Old automatically-assigned DEFAULT_N
  // paths are ignored here so older write-ups can be repaired by the
  // deterministic sequence below instead of all reusing the same image.
  if(explicit && !explicitDefault) return explicit;

  const attack=HOME_ATTACK_IMAGE_MAP[normalizeHomeAttack(firstHomeAttackType(item))];
  if(attack) return `${HOME_ATTACK_LOGO_BASE}${attack}`;

  return HOME_DEFAULT_LOGOS[index % HOME_DEFAULT_LOGOS.length];
}

function allWriteups() {
  if(Array.isArray(LIVE_HOME_WRITEUPS)){
    return LIVE_HOME_WRITEUPS.map(w=>{
      const slug=w.slug||slugifyWriteup(w.title);
      return {...w,slug,tags:normalizeHomeTags(w.tags),url:`writeups.html?slug=${encodeURIComponent(slug)}`};
    });
  }
  const published=getPublishedWriteups();
  const publishedSlugs=new Set(published.map(w=>w.slug||slugifyWriteup(w.title)));
  return [...published,...WRITEUPS.filter(w=>!publishedSlugs.has(w.slug||slugifyWriteup(w.title)))].map(w=>({...w,slug:w.slug||slugifyWriteup(w.title),tags:normalizeHomeTags(w.tags),url:`writeups.html?slug=${encodeURIComponent(w.slug||slugifyWriteup(w.title))}`}));
}

async function loadLiveHomeWriteups(){
  try{
    const response=await fetch('/api/writeups',{credentials:'same-origin',cache:'no-store'});
    if(response.ok){
      const data=await response.json();
      if(Array.isArray(data)) LIVE_HOME_WRITEUPS=data;
    }
  }catch{}
  renderFilters();
  renderWriteups();
}

function renderFilters() {
  if (!filters) return;
  const tags = [...new Map(allWriteups().flatMap(w => normalizeHomeTags(w.tags)).map(t=>[t.toLowerCase(),t])).values()].sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:"base"}));
  filters.innerHTML = `<button class="filter active" data-tag="">All</button>` +
    tags.map(t => `<button class="filter" data-tag="${t}">${t}</button>`).join("");
  $$(".filter", filters).forEach(btn => btn.addEventListener("click", () => {
    $$(".filter", filters).forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    renderWriteups();
  }));
}

function renderWriteups() {
  if (!grid) return;
  const isHome = grid.classList.contains("home-writeup-grid");
  const q = (search?.value || "").toLowerCase().trim();
  const active = filters ? ($( ".filter.active", filters)?.dataset.tag || "").toLowerCase() : "";
  let list = allWriteups().filter(w => {
    const text = `${w.title} ${w.category} ${w.excerpt} ${(w.tags || []).join(" ")}`.toLowerCase();
    return (!q || text.includes(q)) && (!active || normalizeHomeTags(w.tags).some(t=>t.toLowerCase()===active));
  });
  if (isHome) list = list.slice(0, 3);
  const catalogue = allWriteups();
  grid.innerHTML = list.map((w, index) => {
    const stableIndex = catalogue.findIndex(item => String(item.slug || "") === String(w.slug || ""));
    // Use the write-up's stable catalogue position for deterministic DEFAULT_N
    // artwork. This also repairs older entries whose saved logo points to the
    // same default image.
    const logo = resolveHomeWriteupLogo(w, stableIndex >= 0 ? stableIndex : index);
    const visual = logo
      ? `<div class="writeup-card-visual"><img src="${logo}" alt="${w.title || "Write-up"} logo" loading="lazy" onerror="this.closest('.writeup-card-visual')?.classList.add('logo-failed');this.remove()"></div>`
      : `<div class="writeup-card-visual writeup-card-placeholder"><span>${String(w.category || "SECURITY").slice(0,2).toUpperCase()}</span><i class="fa-solid fa-file-code"></i></div>`;
    return `<a class="writeup-card" href="${w.url}">
      ${visual}
      <div class="writeup-card-body">
        <span class="category">${w.category || "SECURITY"}</span>
        <h3>${w.title || "Untitled Security Write-up"}</h3>
        <time>${w.date || ""}</time>
        <span class="writeup-card-action">View Write-up <i class="fa-solid fa-arrow-up-right-from-square"></i></span>
      </div>
    </a>`;
  }).join("");
  if (empty) empty.hidden = list.length !== 0;
  if (showMore) showMore.style.display = allWriteups().length > 3 ? "inline-flex" : "none";
}

if (grid) {
  renderFilters();
  renderWriteups();
  search?.addEventListener("input", renderWriteups);
  loadLiveHomeWriteups();
}


const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      observer.unobserve(e.target);
    }
  });
}, {threshold:.1});
$$(".reveal").forEach(x => observer.observe(x));
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
