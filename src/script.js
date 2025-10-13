/* ===========================
   Configuration / Image mapping
   =========================== */
const PIECE_IMG = {
  // white
  'WP': 'public/WP_mini.webp',
  'WR': 'public/WR_mini.webp',
  'WN': 'public/WN_mini.webp',
  'WB': 'public/WB_mini.webp',
  'WQ': 'public/WQ_mini.webp',
  'WK': 'public/WK_mini.webp',
  // black
  'BP': 'public/BP_mini.webp',
  'BR': 'public/BR_mini.webp',
  'BN': 'public/BN_mini.webp',
  'BB': 'public/BB_mini.webp',
  'BQ': 'public/BQ_mini.webp',
  'BK': 'public/BK_mini.webp'
};
  
  /* ===========================
     State
     =========================== */
  const boardEl = document.getElementById('chessboard');
  const currentPlayerEl = document.getElementById('current-player');
  const resetBtn = document.getElementById('reset-btn');
  
  let board = []; // 8x8 array of piece objects or null. row 0 = rank 8, row 7 = rank 1
  // piece = { type: 'K'|'Q'|'R'|'B'|'N'|'P', color: 'W'|'B', moved: boolean }
  let turn = 'W';
  let selected = null; // {r,c}
  let enPassantTarget = null; // {r,c} square that can be captured via en-passant
  let castleRights = { W: {K:true, Q:true}, B: {K:true, Q:true} };
  let halfmoveClock = 0;
  let fullmoveNumber = 1;
  
  /* ===========================
     Initialization / Rendering
     =========================== */
  
  resetBtn.addEventListener('click', startNewGame);
  boardEl.addEventListener('click', onBoardClick);
  
  startNewGame();
  
  function startNewGame(){
    initBoard();
    turn = 'W';
    selected = null;
    enPassantTarget = null;
    castleRights = { W: {K:true, Q:true}, B: {K:true, Q:true} };
    halfmoveClock = 0;
    fullmoveNumber = 1;
    renderBoard();
    updateCurrentPlayer();
  }
  
  function initBoard(){
    board = Array.from({length:8}, ()=>Array(8).fill(null));
    // set back ranks: row 0 = Black back, row 1 = black pawns, row 6 white pawns, row 7 white back
    const back = ['R','N','B','Q','K','B','N','R'];
    for(let c=0;c<8;c++){
      board[0][c] = {type: back[c], color:'B', moved:false};
      board[1][c] = {type: 'P', color:'B', moved:false};
      board[6][c] = {type: 'P', color:'W', moved:false};
      board[7][c] = {type: back[c], color:'W', moved:false};
    }
  }
  
  function renderBoard(){
    // Clear board element and create 8x8 grid of divs
    while(boardEl.firstChild) boardEl.removeChild(boardEl.firstChild);
  
    boardEl.style.display = 'grid';
    boardEl.style.gridTemplateColumns = 'repeat(8, 1fr)';
    boardEl.style.gridTemplateRows = 'repeat(8, 1fr)';
    boardEl.style.gap = '0';
  
    for(let r=0;r<8;r++){
      for(let c=0;c<8;c++){
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        // For minimal inline styling so cell sizes exist in absence of CSS:
        cell.style.boxSizing = 'border-box';
        // If user CSS already sets sizes, this will be harmless.
        cell.style.width = '64px';
        cell.style.height = '64px';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        // set background color in case CSS doesn't
        const isLight = (r + c) % 2 === 0;
        // cell.style.backgroundColor = isLight ? '#f0d9b5' : '#b58863';
        cell.classList.add(isLight ? 'light' : 'dark');
  
        // highlight selected
        if(selected && selected.r==r && selected.c==c){
          cell.classList.add('selected');
        }
  
        const piece = board[r][c];
        if(piece){
          const code = `${piece.color}${piece.type.toLowerCase()}`;
          // Normalize code keys expected above: 'Wp' etc.
          const key = `${piece.color}${piece.type.toLowerCase() === piece.type ? piece.type : piece.type}`; // keep simple
          // Build expected mapping key: 'Wp','Wr', etc.
          const mapKey = `${piece.color}${piece.type}`;
          const img = document.createElement('img');
          img.draggable = false;
          // set src from mapping if exists
          if(PIECE_IMG[mapKey]){
            img.src = PIECE_IMG[mapKey];
          } else {
            // fallback: generate textual label as data URL SVG (so something is visible)
            img.alt = `[${mapKey}]`;
            img.style.width = '32px';
            img.style.height = '32px';
          }
          img.style.maxWidth = '90%';
          img.style.maxHeight = '90%';
          img.dataset.r = r;
          img.dataset.c = c;
          cell.appendChild(img);
        }
  
        boardEl.appendChild(cell);
      }
    }
  }
  
  /* ===========================
     Click handling - selection & moves
     =========================== */
     function onBoardClick(ev){
      // find the clicked cell (may be img or div)
      let target = ev.target;
      while(target && target !== boardEl && !target.classList.contains('cell')){
        target = target.parentElement;
      }
      if(!target || target === boardEl) return;
      const r = parseInt(target.dataset.r, 10);
      const c = parseInt(target.dataset.c, 10);
      if(Number.isNaN(r) || Number.isNaN(c)) return;
    
      const piece = board[r][c];
    
      if(selected){
        // If user clicked the same selected square -> deselect
        if(selected.r === r && selected.c === c){
          selected = null;
          renderBoard();
          return;
        }
    
        // attempt to move selected -> (r,c)
        const from = {r: selected.r, c: selected.c};
        const legalMoves = generateLegalMovesForSquare(from.r, from.c);
        const move = legalMoves.find(m => m.r === r && m.c === c);
        if(move){
          performMove(from, {r,c}, move);
          selected = null;
          renderBoard();
          postMoveChecks();
        } else {
          // If clicked own piece, change selection and highlight its legal moves
          if(piece && piece.color === turn){
            selected = {r,c};
            renderBoard();
            const newLegalMoves = generateLegalMovesForSquare(r, c);
            highlightLegalMoves(newLegalMoves);
          } else {
            // invalid target, deselect
            selected = null;
            renderBoard();
          }
        }
      } else {
        // no selection -> select if player's piece
        if(piece && piece.color === turn){
          selected = {r,c};
          renderBoard();
          const legalMoves = generateLegalMovesForSquare(r, c);
          highlightLegalMoves(legalMoves);
        }
      }
    }
      
  /* ===========================
     Move generation & validation
     =========================== */
  
  // Return list of pseudo-legal moves for piece at r,c (may leave king in check)
  // moves are objects: { r, c, capture?:bool, doublePawn?:bool, enPassant?:bool, castle?: 'K'|'Q' }
  function generatePseudoLegalMoves(r, c){
    const piece = board[r][c];
    if(!piece) return [];
    const color = piece.color;
    const moves = [];
    const dir = (color === 'W') ? -1 : 1;
  
    if(piece.type === 'P'){
      // single forward
      const f1 = r + dir;
      if(inBounds(f1, c) && !board[f1][c]){
        moves.push({r: f1, c, capture: false});
        // double forward
        const startRow = (color === 'W') ? 6 : 1;
        const f2 = r + 2*dir;
        if(r === startRow && inBounds(f2, c) && !board[f2][c]){
          moves.push({r: f2, c, capture: false, doublePawn: true});
        }
      }
      // captures
      for(let dc of [-1,1]){
        const cr = r + dir, cc = c + dc;
        if(inBounds(cr,cc)){
          const p = board[cr][cc];
          if(p && p.color !== color){
            moves.push({r:cr, c:cc, capture:true});
          } else if(!p && enPassantTarget && enPassantTarget.r === cr && enPassantTarget.c === cc){
            // en-passant capture
            moves.push({r:cr, c:cc, capture:true, enPassant:true});
          }
        }
      }
      return moves;
    }
  
    if(piece.type === 'N'){
      const deltas = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      for(const [dr,dc] of deltas){
        const nr = r + dr, nc = c + dc;
        if(inBounds(nr,nc)){
          const p = board[nr][nc];
          if(!p || p.color !== color) moves.push({r:nr, c:nc, capture: !!p});
        }
      }
      return moves;
    }
  
    if(piece.type === 'B' || piece.type === 'R' || piece.type === 'Q'){
      const directions = [];
      if(piece.type === 'B' || piece.type === 'Q'){
        directions.push([-1,-1],[-1,1],[1,-1],[1,1]);
      }
      if(piece.type === 'R' || piece.type === 'Q'){
        directions.push([-1,0],[1,0],[0,-1],[0,1]);
      }
      for(const [dr,dc] of directions){
        let nr = r + dr, nc = c + dc;
        while(inBounds(nr,nc)){
          const p = board[nr][nc];
          if(!p){
            moves.push({r:nr,c:nc, capture:false});
          } else {
            if(p.color !== color) moves.push({r:nr,c:nc,capture:true});
            break;
          }
          nr += dr; nc += dc;
        }
      }
      return moves;
    }
  
    if(piece.type === 'K'){
      for(let dr=-1; dr<=1; dr++){
        for(let dc=-1; dc<=1; dc++){
          if(dr===0 && dc===0) continue;
          const nr = r + dr, nc = c + dc;
          if(inBounds(nr,nc)){
            const p = board[nr][nc];
            if(!p || p.color !== color) moves.push({r:nr,c:nc, capture: !!p});
          }
        }
      }
      // castling (pseudo-legal here, real legality filtered later)
      if(!piece.moved){
        // king-side
        if(castleRights[color].K){
          const rookC = 7;
          if(board[r][rookC] && board[r][rookC].type==='R' && !board[r][rookC].moved){
            if(!board[r][5] && !board[r][6]){
              moves.push({r:r, c:6, castle:'K'});
            }
          }
        }
        // queen-side
        if(castleRights[color].Q){
          const rookC = 0;
          if(board[r][rookC] && board[r][rookC].type==='R' && !board[r][rookC].moved){
            if(!board[r][1] && !board[r][2] && !board[r][3]){
              moves.push({r:r, c:2, castle:'Q'});
            }
          }
        }
      }
      return moves;
    }
  
    return moves;
  }
  
  // Return legal moves (filtering out ones that leave king in check)
  function generateLegalMovesForSquare(r, c){
    const piece = board[r][c];
    if(!piece || piece.color !== turn) return [];
    const pseudo = generatePseudoLegalMoves(r,c);
    const legal = pseudo.filter(move => {
      const copy = cloneGameState();
      applyMoveOnBoard(copy.board, {r,c}, {r:move.r, c:move.c}, move, copy);
      // If own king still exists and is not in check -> legal
      return !isKingInCheckOnBoard(copy.board, piece.color, copy);
    });
    return legal;
  }
  
  function highlightLegalMoves(legalMoves) {
    // Highlight possible legal moves
    for (const move of legalMoves) {
      const cell = document.querySelector(`.cell[data-r="${move.r}"][data-c="${move.c}"]`);
      if (cell) {
        cell.classList.add('possible-move');
      }
    }
  }
  
  /* ===========================
     Move application
     =========================== */
  function performMove(from, to, move){
    const piece = board[from.r][from.c];
    let captured = null;
  
    // en-passant capture handling
    if(move.enPassant){
      // capture the pawn behind target square
      const capR = from.r;
      const capC = to.c;
      captured = board[capR][capC];
      board[capR][capC] = null;
    } else {
      captured = board[to.r][to.c];
    }
  
    // move piece
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;
    piece.moved = true;
  
    // castling: move rook
    if(move.castle){
      if(move.castle === 'K'){
        // rook from 7 -> 5
        const r = from.r;
        board[r][5] = board[r][7];
        board[r][7] = null;
        if(board[r][5]) board[r][5].moved = true;
      } else {
        // queen side: rook from 0 -> 3
        const r = from.r;
        board[r][3] = board[r][0];
        board[r][0] = null;
        if(board[r][3]) board[r][3].moved = true;
      }
      // update castle rights for moving side
      castleRights[piece.color].K = false;
      castleRights[piece.color].Q = false;
    }
  
    // update castle rights if king or rook moved/captured
    if(piece.type === 'K'){
      castleRights[piece.color].K = false;
      castleRights[piece.color].Q = false;
    }
    if(piece.type === 'R'){
      if(from.c === 0) castleRights[piece.color].Q = false;
      if(from.c === 7) castleRights[piece.color].K = false;
    }
    if(captured && captured.type === 'R'){
      // if rook captured, update rights for captured side
      if(to.c === 0) castleRights[captured.color].Q = false;
      if(to.c === 7) castleRights[captured.color].K = false;
    }
  
    // en-passant target: if pawn moved two squares, set target
    if(piece.type === 'P' && Math.abs(to.r - from.r) === 2){
      enPassantTarget = { r: (from.r + to.r) / 2, c: to.c };
    } else {
      enPassantTarget = null;
    }
  
    // pawn promotion
    if(piece.type === 'P'){
      const lastRank = (piece.color === 'W') ? 0 : 7;
      if(to.r === lastRank){
        showPromotionTooltip(piece.color, to.r, to.c);
      }
    }
  
    // halfmove clock reset rules
    if(piece.type === 'P' || captured) {
      halfmoveClock = 0;
    } else {
      halfmoveClock++;
    }
  
    // fullmove number increment after black's move
    if(turn === 'B') fullmoveNumber++;
  
    // swap turn
    turn = (turn === 'W') ? 'B' : 'W';
    updateCurrentPlayer();
  }
  
  function showPromotionTooltip(color, r, c) {
    // Remove existing tooltip if any
    const oldTooltip = document.getElementById('promotion-tooltip');
    if (oldTooltip) oldTooltip.remove();
  
    const tooltip = document.createElement('div');
    tooltip.id = 'promotion-tooltip';
    tooltip.className = 'promotion-tooltip';
  
    const pieces = ['Q', 'R', 'B', 'N'];
  
    pieces.forEach(type => {
      const option = document.createElement('div');
      option.className = 'promotion-option';
      const mapKey = `${color}${type}`;
      const img = document.createElement('img');
      img.src = PIECE_IMG[mapKey];
      img.alt = type;
      img.draggable = false;
      img.className = 'promotion-icon';
      const label = document.createElement('span');
      label.textContent = type;
      option.appendChild(img);
      option.appendChild(label);
      option.addEventListener('click', () => {
        board[r][c] = { type, color, moved: true };
        tooltip.remove();
        renderBoard();
        postMoveChecks();
      });
      tooltip.appendChild(option);
    });
  
    // Position tooltip near clicked square
    const cell = document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
    if (cell) {
      const rect = cell.getBoundingClientRect();
      tooltip.style.position = 'absolute';
      tooltip.style.left = `${rect.left + window.scrollX}px`;
      tooltip.style.top = `${rect.top + window.scrollY - 70}px`; // slightly above
    }
  
    document.body.appendChild(tooltip);
  }
  
  /* ===========================
     Post-move checks: check, mate, stalemate
     =========================== */
  function postMoveChecks(){
    const colorToMove = turn;
    const inCheck = isKingInCheckOnBoard(board, colorToMove, { enPassantTarget, castleRights });
    const anyMoves = anyLegalMovesExist(colorToMove);
    if(inCheck && !anyMoves){
      // checkmate - previous player wins
      const winner = (turn === 'W') ? 'Black' : 'White';
      alert(`Checkmate — ${winner} wins.`);
      // do not auto-reset; user can press New Game
    } else if(!inCheck && !anyMoves){
      alert('Stalemate — draw.');
    } else if(inCheck){
      // mark check indicator in small visual way via current player text
      currentPlayerEl.textContent = `${turn === 'W' ? 'White' : 'Black'} (CHECK)`;
    } else {
      updateCurrentPlayer();
    }
  }
  
  /* ===========================
     Utility / Rules helpers
     =========================== */
  
  function inBounds(r,c){ return r >= 0 && r < 8 && c >= 0 && c < 8; }
  
  // clone board and state for move legality checks
  function cloneGameState(){
    const b = board.map(row => row.map(cell => cell ? { type: cell.type, color: cell.color, moved: !!cell.moved } : null));
    const ep = enPassantTarget ? { r: enPassantTarget.r, c: enPassantTarget.c } : null;
    const cr = { W: {K:castleRights.W.K, Q:castleRights.W.Q}, B: {K:castleRights.B.K, Q:castleRights.B.Q} };
    return { board: b, enPassantTarget: ep, castleRights: cr };
  }
  
  // apply move on a provided board state. Used for simulating moves when checking for checks.
  // This function mirrors performMove but acts on provided board array and does not mutate outer state.
  function applyMoveOnBoard(boardState, from, to, move, context){
    // boardState is a 2D array references to objects or null
    const piece = boardState[from.r][from.c];
    if(!piece) return;
    // en-passant capture on the simulated board
    if(move.enPassant){
      const capR = from.r;
      const capC = to.c;
      boardState[capR][capC] = null;
    }
    // move
    boardState[to.r][to.c] = piece;
    boardState[from.r][from.c] = null;
  
    // handle castling
    if(move.castle){
      if(move.castle === 'K'){
        boardState[from.r][5] = boardState[from.r][7];
        boardState[from.r][7] = null;
      } else {
        boardState[from.r][3] = boardState[from.r][0];
        boardState[from.r][0] = null;
      }
    }
  
    // handle promotion: for simulation, always promote to queen (safest for check detection)
    if(piece.type === 'P'){
      const lastRank = (piece.color === 'W') ? 0 : 7;
      if(to.r === lastRank){
        boardState[to.r][to.c] = { type: 'Q', color: piece.color, moved: true };
      }
    }
  }
  
  // find king coords on given board
  function findKingOnBoard(boardState, color){
    for(let r=0;r<8;r++){
      for(let c=0;c<8;c++){
        const p = boardState[r][c];
        if(p && p.type === 'K' && p.color === color) return {r,c};
      }
    }
    return null;
  }
  
  function isKingInCheckOnBoard(boardState, color, context){
    // Determine if `color`'s king is under attack on the given boardState.
    // boardState: 2D array [r][c] of piece objects or null
    // color: 'W' or 'B'
    // context: optional (not required here but kept for parity)
  
    const enemy = (color === 'W') ? 'B' : 'W';
    const kingPos = findKingOnBoard(boardState, color);
    if (!kingPos) return true; // no king -> treat as in check
  
    const kr = kingPos.r, kc = kingPos.c;
  
    // --- Pawn attacks ---
    // Enemy pawns attack from one row _toward_ the king:
    // - If enemy is WHITE, their pawns move up (r-1), so to attack the king at (kr,kc)
    //   a white pawn must be at (kr + 1, kc +/- 1).
    // - If enemy is BLACK, their pawns move down (r+1), so to attack the king at (kr,kc)
    //   a black pawn must be at (kr - 1, kc +/- 1).
    const pawnRow = (enemy === 'W') ? kr + 1 : kr - 1;
    for (const dc of [-1, 1]) {
      const pr = pawnRow, pc = kc + dc;
      if (inBounds(pr, pc)) {
        const p = boardState[pr][pc];
        if (p && p.color === enemy && p.type === 'P') return true;
      }
    }
  
    // --- Knight attacks ---
    const knightD = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    for (const [dr, dc] of knightD) {
      const nr = kr + dr, nc = kc + dc;
      if (inBounds(nr, nc)) {
        const p = boardState[nr][nc];
        if (p && p.color === enemy && p.type === 'N') return true;
      }
    }
  
    // --- Sliding pieces and adjacent king ---
    const directions = [
      [-1,0],[1,0],[0,-1],[0,1],       // orthogonal (rook/queen)
      [-1,-1],[-1,1],[1,-1],[1,1]      // diagonal (bishop/queen)
    ];
    for (const [dr, dc] of directions) {
      let nr = kr + dr, nc = kc + dc;
      while (inBounds(nr, nc)) {
        const p = boardState[nr][nc];
        if (p) {
          if (p.color === enemy) {
            // orthogonal directions -> rook or queen attacks
            if (dr === 0 || dc === 0) {
              if (p.type === 'R' || p.type === 'Q') return true;
            } else {
              // diagonal -> bishop or queen attacks
              if (p.type === 'B' || p.type === 'Q') return true;
            }
            // adjacent enemy king (shouldn't normally happen, but check)
            if (Math.abs(nr - kr) <= 1 && Math.abs(nc - kc) <= 1 && p.type === 'K') return true;
          }
          break; // blocked by a piece
        }
        nr += dr; nc += dc;
      }
    }
  
    return false;
  }
    
  // Check existence of any legal move for color
  function anyLegalMovesExist(color){
    const oldTurn = turn;
    turn = color;
    let found = false;
    outer:
    for(let r=0;r<8;r++){
      for(let c=0;c<8;c++){
        const p = board[r][c];
        if(p && p.color === color){
          const moves = generateLegalMovesForSquare(r,c);
          if(moves.length > 0){
            found = true;
            break outer;
          }
        }
      }
    }
    turn = oldTurn;
    return found;
  }
  
  function updateCurrentPlayer(){
    currentPlayerEl.textContent = (turn === 'W') ? 'White' : 'Black';
  }
  
  /* ===========================
     End of file
     =========================== */
  