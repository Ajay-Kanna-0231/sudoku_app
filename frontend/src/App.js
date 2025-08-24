import React, { useState } from "react";
import { SimpleGrid, Box, ChakraProvider, Center, Button, VStack, HStack } from "@chakra-ui/react";
import axios from "axios";

const GRID_SIZE = 9;   // Sudoku is 9x9
const CELL_SIZE = 50;  // each square 50px

function SudokuBoard({puzzle}) {
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

        return (
          <Box
            key={cell.key}
            w={`${CELL_SIZE}px`}
            h={`${CELL_SIZE}px`}
            bg="black"               // cell background black
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="lg"
            color="white"             // cell text (numbers) in white
            {...borderStyles}
          >
            {value === 0 ? "" : value}
          </Box>
        );
      })}
    </SimpleGrid>
  );
}

function DifficultyButtons({ setPuzzle }) {
  const handleDifficultyClick = async (difficulty) => {
    try {
      const response = await axios.get(`http://localhost:5000/generate-puzzle?difficulty=${difficulty}`);
      setPuzzle(response.data.puzzle);
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

  return (
    <ChakraProvider>
      {/* centers horizontally & vertically, full viewport height */}
      <Center minH="100vh" bg="gray.900" p={6}>
        <VStack spacing={6}>
          <DifficultyButtons setPuzzle={setPuzzle} />
          <SudokuBoard puzzle={puzzle} />
        </VStack>
      </Center>
    </ChakraProvider>
  );
}
