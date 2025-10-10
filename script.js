// Chess pieces unicode symbols
const pieces = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

// Initial board setup
const initialBoard = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
];

let board = JSON.parse(JSON.stringify(initialBoard));
let currentPlayer = 'white';
let selectedSquare = null;

// Initialize the chessboard
function initBoard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = 'square';
            square.className += (row + col) % 2 === 0 ? ' light' : ' dark';
            square.dataset.row = row;
            square.dataset.col = col;
            square.textContent = board[row][col];
            square.addEventListener('click', handleSquareClick);
            chessboard.appendChild(square);
        }
    }
}

// Handle square click
function handleSquareClick(event) {
    const square = event.target;
    const row = parseInt(square.dataset.row);
    const col = parseInt(square.dataset.col);
    
    if (selectedSquare) {
        // Try to move piece
        movePiece(selectedSquare, { row, col });
        clearSelection();
    } else {
        // Select piece
        const piece = board[row][col];
        if (piece && isPieceOfCurrentPlayer(piece)) {
            selectedSquare = { row, col };
            highlightSquare(row, col);
        }
    }
}

// Check if piece belongs to current player
function isPieceOfCurrentPlayer(piece) {
    const whitePieces = Object.values(pieces.white);
    const blackPieces = Object.values(pieces.black);
    
    if (currentPlayer === 'white' && whitePieces.includes(piece)) {
        return true;
    }
    if (currentPlayer === 'black' && blackPieces.includes(piece)) {
        return true;
    }
    return false;
}

// Move piece
function movePiece(from, to) {
    const piece = board[from.row][from.col];
    const targetPiece = board[to.row][to.col];
    
    // Basic validation: can't capture your own piece
    if (targetPiece && isPieceOfCurrentPlayer(targetPiece)) {
        return;
    }
    
    // Move the piece
    board[to.row][to.col] = piece;
    board[from.row][from.col] = '';
    
    // Switch player
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    updateCurrentPlayer();
    
    // Refresh board
    initBoard();
}

// Highlight selected square
function highlightSquare(row, col) {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        if (parseInt(square.dataset.row) === row && parseInt(square.dataset.col) === col) {
            square.classList.add('selected');
        }
    });
}

// Clear selection
function clearSelection() {
    selectedSquare = null;
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        square.classList.remove('selected');
        square.classList.remove('possible-move');
    });
}

// Update current player display
function updateCurrentPlayer() {
    const playerDisplay = document.getElementById('current-player');
    playerDisplay.textContent = currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1);
}

// Reset game
function resetGame() {
    board = JSON.parse(JSON.stringify(initialBoard));
    currentPlayer = 'white';
    selectedSquare = null;
    updateCurrentPlayer();
    initBoard();
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    initBoard();
    document.getElementById('reset-btn').addEventListener('click', resetGame);
});
