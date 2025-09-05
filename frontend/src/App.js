import React, { useState } from "react";
import { SimpleGrid, Box, ChakraProvider, Center, Button, VStack, HStack } from "@chakra-ui/react";
import axios from "axios";

const GRID_SIZE = 9;   // Sudoku is 9x9
const CELL_SIZE = 50;  // each square 50px

function SudokuBoard({ puzzle, setPuzzle }) {
  // check if placing value at row,col is valid
  const isValidMove = (grid, row, col, val) => {
    if (val === 0) return true;

    // check row
    for (let c = 0; c < GRID_SIZE; c++) {
      if (c !== col && grid[row][c] === val) return false;
    }
    // check col
    for (let r = 0; r < GRID_SIZE; r++) {
      if (r !== row && grid[r][col] === val) return false;
    }
    // check 3x3 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        if ((r !== row || c !== col) && grid[r][c] === val) return false;
      }
    }
    return true;
  };

  let cells = [];
  // Build 9x9 cells like in Python
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      cells.push({
        key: row * GRID_SIZE + col,
        row: row,
        col: col,
      });
    }
  }

  return (
    <SimpleGrid
      columns={GRID_SIZE}
      spacing={0}
      borderWidth="2px"
      borderColor="white"
      width={`${CELL_SIZE * GRID_SIZE}px`}
    >
      {cells.map((cell) => {
        // thicker border every 3 rows/cols
        const borderStyles = {
          borderTopWidth: cell.row % 3 === 0 ? "2px" : "1px",
          borderLeftWidth: cell.col % 3 === 0 ? "2px" : "1px",
          borderRightWidth: (cell.col + 1) % 3 === 0 ? "2px" : "1px",
          borderBottomWidth: (cell.row + 1) % 3 === 0 ? "2px" : "1px",
          borderColor: "white",       // cell borders white
          borderStyle: "solid",
        };

        // read the number from puzzle prop (0 => empty)
        const value =
          puzzle && puzzle[cell.row] && typeof puzzle[cell.row][cell.col] !== "undefined"
            ? puzzle[cell.row][cell.col]
            : 0;

        const valid = isValidMove(puzzle, cell.row, cell.col, value);

        return (
          <Box
            key={cell.key}
            data-cell-key={cell.key} // Add this line
            w={`${CELL_SIZE}px`}
            h={`${CELL_SIZE}px`}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="black"
            {...borderStyles}
          >
            <input
              type="text"
              value={value === 0 ? "" : value}
              maxLength={1}
              onChange={(e) => {
                const newVal = parseInt(e.target.value) || 0;
                const newPuzzle = puzzle.map((row, r) =>
                  row.map((col, c) =>
                    r === cell.row && c === cell.col ? newVal : col
                  )
                );
                // update board
                setPuzzle(newPuzzle);
              }}
              style={{
                width: "100%",
                height: "100%",
                textAlign: "center",
                backgroundColor: "black",
                color: "white",
                fontSize: "20px",
                border: valid ? "none" : "2px solid red",
                outline: "none",
              }}
            />
          </Box>
        );
      })}
    </SimpleGrid>
  );
}

function DifficultyButtons({ setPuzzle, setSolution }) {
  const handleDifficultyClick = async (difficulty) => {
    try {
      const response = await axios.get(`/api/generate-puzzle?difficulty=${difficulty}`);
      setPuzzle(response.data.puzzle);
      setSolution(response.data.solution);   // store solution too
    } catch (error) {
      alert("Backend error: " + error.message);  // show on screen instead of just console
      console.error("Error fetching puzzle:", error);
    }
  };

  return (
    <HStack spacing={4} mb={6}>
      <Button colorScheme="green" onClick={() => handleDifficultyClick("easy")}>Easy</Button>
      <Button colorScheme="yellow" onClick={() => handleDifficultyClick("medium")}>Medium</Button>
      <Button colorScheme="red" onClick={() => handleDifficultyClick("hard")}>Hard</Button>
    </HStack>
  );
}

export default function App() {
  const [puzzle, setPuzzle] = useState(
    Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0))
  );
  const [solution, setSolution] = useState(null);

  const handleSolveClick = async () => {
    try {
      const response = await axios.post("/api/solve-puzzle", {
        puzzle: puzzle,
      });
      setPuzzle(response.data.solution); // Update to match the backend response structure
    } catch (error) {
      alert("Error solving puzzle: " + error.message);
      console.error("Error solving puzzle:", error);
    }
  };

  const handleHintClick = () => {
    if (!solution) {
      alert("No solution available yet! Please generate a puzzle first.");
      return;
    }

    // find an empty or incorrect cell
    const candidates = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (puzzle[r][c] === 0 || puzzle[r][c] !== solution[r][c]) {
          candidates.push([r, c]);
        }
      }
    }

    if (candidates.length === 0) {
      alert("No empty cells left!");
      return;
    }

    // pick a random candidate cell
    const [row, col] = candidates[Math.floor(Math.random() * candidates.length)];

    // fill it with the correct solution value
    const newPuzzle = puzzle.map((r, ri) =>
      r.map((val, ci) => (ri === row && ci === col ? solution[ri][ci] : val))
    );
    setPuzzle(newPuzzle);

    // Highlight the cell temporarily
    const cellKey = row * GRID_SIZE + col;
    const cellElement = document.querySelector(`[data-cell-key='${cellKey}']`);
    if (cellElement) {
      cellElement.style.border = "2px solid green";
      setTimeout(() => {
        cellElement.style.border = "none";
      }, 1000); // Remove highlight after 1 second
    }
  };

  return (
    <ChakraProvider>
      <Center minH="100vh" bg="gray.900" p={6}>
        <VStack spacing={6}>
          <DifficultyButtons setPuzzle={setPuzzle} setSolution={setSolution} />
          <HStack>
            <Button colorScheme="blue" onClick={handleSolveClick}>
              Solve it fully
            </Button>
            <Button colorScheme="purple" onClick={handleHintClick}>
              Show Hint
            </Button>
          </HStack>
          <SudokuBoard puzzle={puzzle} setPuzzle={setPuzzle} />
        </VStack>
      </Center>
    </ChakraProvider>
  );
}
