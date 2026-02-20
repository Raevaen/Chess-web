/**
 * ai.js - Handles communication with the Gemini API for the chess AI opponent.
 */

// Function schema for Gemini to call
const moveToolSchema = {
    functionDeclarations: [
        {
            name: "make_move",
            description: "Execute a chess move given a start and end coordinate.",
            parameters: {
                type: "OBJECT",
                properties: {
                    from_r: {
                        type: "INTEGER",
                        description: "The starting row index (0-7)."
                    },
                    from_c: {
                        type: "INTEGER",
                        description: "The starting column index (0-7)."
                    },
                    to_r: {
                        type: "INTEGER",
                        description: "The ending row index (0-7)."
                    },
                    to_c: {
                        type: "INTEGER",
                        description: "The ending column index (0-7)."
                    }
                },
                required: ["from_r", "from_c", "to_r", "to_c"]
            }
        }
    ]
};

/**
 * Fetches a move from Gemini and returns the target move object.
 * @param {string} apiKey The user's Google AI Studio API key
 * @param {Array} legalMoves Array of valid move objects
 * @param {Array} board The current 8x8 game board
 * @returns {Object} The valid move selected by the AI, or a random valid move if an error/hallucination occurs
 */
async function fetchAIMove(apiKey, legalMoves, board) {
    if (!apiKey) {
        throw new Error("Missing API Key");
    }

    // If no moves, shouldn't really be called, but handle it
    if (!legalMoves || legalMoves.length === 0) {
        throw new Error("No legal moves available.");
    }

    // 1. Serialize the board state and legal moves
    const boardStr = serializeBoard(board);
    let movesStr = "List of all legal moves you can make:\n";
    
    // Group moves by piece type and starting location to make it easier for the AI
    const movesByPiece = {};
    for (const m of legalMoves) {
        const piece = board[m.from.r][m.from.c];
        const key = `[${m.from.r}, ${m.from.c}] (${piece.color}${piece.type})`;
        if (!movesByPiece[key]) {
            movesByPiece[key] = [];
        }
        movesByPiece[key].push(`[${m.r}, ${m.c}]`);
    }

    for (const [key, targets] of Object.entries(movesByPiece)) {
        movesStr += `- Piece at ${key} can move to: ${targets.join(', ')}\n`;
    }

    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { 
                        text: `You are playing a game of chess. You are Black.
The board is represented as an 8x8 grid. Row 0 is the top (Black's starting side), Row 7 is the bottom (White's starting side). Columns 0-7 go from left to right.
Current Board state (Empty squares are '.'):
${boardStr}

It is your turn.
${movesStr}

Analyze the board and choose ONE of the legal moves above. You MUST call the make_move function to execute your chosen move. 
If you try to make an illegal move, you will lose.`
                    }
                ]
            }
        ],
        tools: [moveToolSchema],
        toolConfig: {
            functionCallingConfig: {
                mode: "ANY",
                allowedFunctionNames: ["make_move"]
            }
        }
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API Error ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const functionCallPart = candidate?.content?.parts?.find(p => p.functionCall);

        if (functionCallPart && functionCallPart.functionCall.name === "make_move") {
            const args = functionCallPart.functionCall.args;
            const from_r = args.from_r;
            const from_c = args.from_c;
            const to_r = args.to_r;
            const to_c = args.to_c;

            // 2. Validate move against legal list
            const matchedMove = legalMoves.find(m => 
                m.from.r === from_r && m.from.c === from_c &&
                m.r === to_r && m.c === to_c
            );

            if (matchedMove) {
                console.log(`AI selected valid move: [${from_r}, ${from_c}] to [${to_r}, ${to_c}]`);
                return matchedMove;
            } else {
                console.warn(`AI hallucinated an illegal move: [${from_r}, ${from_c}] to [${to_r}, ${to_c}]. Falling back to random valid move.`);
                return getRandomMove(legalMoves);
            }
        } else {
            console.warn("AI did not return a function call. Falling back to random valid move.");
            return getRandomMove(legalMoves);
        }

    } catch (e) {
        console.error("AI Error:", e);
        console.warn("Falling back to random valid move due to error.");
        return getRandomMove(legalMoves);
    }
}

function getRandomMove(legalMoves) {
    const randomIndex = Math.floor(Math.random() * legalMoves.length);
    const m = legalMoves[randomIndex];
    console.log(`Fallback random move selected: [${m.from.r}, ${m.from.c}] to [${m.r}, ${m.c}]`);
    return m;
}

function serializeBoard(board) {
    let result = "";
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            result += p ? `${p.color}${p.type} ` : ".  ";
        }
        result += "\n";
    }
    return result;
}
