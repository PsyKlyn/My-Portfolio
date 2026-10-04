/* Shared interactive square-grid background used by the portfolio pages. */
(() => {
  const grid = document.getElementById("interactiveGrid");
  if (!grid) return;

  let cols = 0, rows = 0, size = 26, cells = [];
  let activeCol = -1, activeRow = -1, activeStarted = 0;
  let trail = new Map();
  let raf = 0, resizeTimer;
  const FADE_MS = 1350;
  const TRAIL_FADE_MS = 1350;
  const intensity = [[0.30,0.52,0.30],[0.52,1.00,0.52],[0.30,0.52,0.30]];

  function buildGrid(){
    size = window.innerWidth <= 600 ? 22 : 26;
    cols = Math.ceil(window.innerWidth / size) + 1;
    rows = Math.ceil(window.innerHeight / size) + 1;
    grid.style.setProperty('--cell-size', `${size}px`);
    grid.style.setProperty('--grid-cols', cols);
    grid.innerHTML = '';
    cells = [];
    trail.clear();
    activeCol = activeRow = -1;
    activeStarted = 0;
    const frag = document.createDocumentFragment();
    for(let i=0;i<cols*rows;i++){
      const cell=document.createElement('div');
      cell.className='grid-cell';
      cell.style.setProperty('--heat','0');
      cells.push(cell);
      frag.appendChild(cell);
    }
    grid.appendChild(frag);
  }
  function footprint(col,row){
    const out=[];
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
      const c=col+dx,r=row+dy;
      if(c>=0&&r>=0&&c<cols&&r<rows) out.push({index:r*cols+c,heat:intensity[dy+1][dx+1]});
    }
    return out;
  }
  function moveTo(x,y){
    const col=Math.floor(x/size), row=Math.floor(y/size);
    if(col<0||row<0||col>=cols||row>=rows) return;
    const now=performance.now();
    if(activeCol>=0 && activeRow>=0 && (col!==activeCol||row!==activeRow)){
      for(const {index,heat} of footprint(activeCol,activeRow)){
        const old=trail.get(index);
        trail.set(index,{heat:Math.max(old?.heat||0,heat),started:now});
      }
    }
    activeCol=col; activeRow=row; activeStarted=now;
  }
  function leave(){
    if(activeCol<0||activeRow<0) return;
    const now=performance.now();
    for(const {index,heat} of footprint(activeCol,activeRow)){
      const old=trail.get(index);
      trail.set(index,{heat:Math.max(old?.heat||0,heat),started:now});
    }
    activeCol=activeRow=-1; activeStarted=0;
  }
  function frame(now){
    for(const cell of cells) cell.style.setProperty('--heat','0');
    for(const [index,item] of trail){
      const cell=cells[index];
      if(!cell){trail.delete(index);continue;}
      const progress=Math.min(1,(now-item.started)/TRAIL_FADE_MS);
      const heat=item.heat*Math.pow(1-progress,2.05);
      if(heat<=0.002){trail.delete(index);continue;}
      cell.style.setProperty('--heat',heat.toFixed(3));
    }
    if(activeCol>=0&&activeRow>=0){
      const progress=Math.min(1,(now-activeStarted)/FADE_MS);
      const fade=Math.pow(1-progress,1.7);
      if(fade<=0.002){activeCol=activeRow=-1;activeStarted=0;}
      else for(const {index,heat} of footprint(activeCol,activeRow)){
        const cell=cells[index]; if(!cell) continue;
        const existing=parseFloat(cell.style.getPropertyValue('--heat'))||0;
        cell.style.setProperty('--heat',Math.max(existing,heat*fade).toFixed(3));
      }
    }
    raf=requestAnimationFrame(frame);
  }
  buildGrid();
  raf=requestAnimationFrame(frame);
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(buildGrid,100)},{passive:true});
  window.addEventListener('mousemove',e=>moveTo(e.clientX,e.clientY),{passive:true});
  document.addEventListener('mouseleave',leave,{passive:true});
})();
