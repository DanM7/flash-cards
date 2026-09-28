import type { Card, ScienceDeck } from "../../CardTypes";

interface Question {
  prompt: string;
  choices: [string, string, string, string];
  /** Index into choices of the correct answer. */
  correct: number;
}

const toCard = (question: Question): Card => ({
  prompt: question.prompt,
  answers: [question.choices[question.correct]],
  choices: [...question.choices]
});

const makeDeck = (unit: number, title: string, questions: Question[]): ScienceDeck => ({
  subject: "science",
  grade: 6,
  unitLabel: `Unit ${unit}: ${title}`,
  cards: questions.map(toCard)
});

export const cellsDeck = makeDeck(1, "Cells", [
  {
    prompt: "What is the basic unit of life?",
    choices: ["Atom", "Cell", "Tissue", "Organ"],
    correct: 1
  },
  {
    prompt: "Which structure controls what enters and leaves the cell?",
    choices: ["Nucleus", "Cell wall", "Cell membrane", "Cytoplasm"],
    correct: 2
  },
  {
    prompt: "What part of the cell contains DNA?",
    choices: ["Mitochondria", "Nucleus", "Ribosome", "Vacuole"],
    correct: 1
  },
  {
    prompt: "Which structure is found only in plant cells?",
    choices: ["Cell membrane", "Nucleus", "Chloroplast", "Mitochondria"],
    correct: 2
  },
  {
    prompt: "What is the job of mitochondria?",
    choices: ["Store water", "Make proteins", "Produce energy", "Control the cell"],
    correct: 2
  }
]);

export const humanBodyDeck = makeDeck(2, "Human Body", [
  {
    prompt: "Which system carries oxygen and nutrients through the body?",
    choices: ["Digestive system", "Circulatory system", "Nervous system", "Muscular system"],
    correct: 1
  },
  {
    prompt: "What organ is the main control center of the body?",
    choices: ["Heart", "Brain", "Stomach", "Lungs"],
    correct: 1
  },
  {
    prompt: "Which system helps you breathe?",
    choices: ["Respiratory system", "Digestive system", "Skeletal system", "Immune system"],
    correct: 0
  },
  {
    prompt: "What is the main function of the skeletal system?",
    choices: ["Pump blood", "Break down food", "Provide structure and support", "Send signals"],
    correct: 2
  },
  {
    prompt: "Which organ pumps blood throughout the body?",
    choices: ["Brain", "Lungs", "Heart", "Liver"],
    correct: 2
  }
]);

export const geneticsDeck = makeDeck(3, "Genetics", [
  {
    prompt: "What carries genetic information?",
    choices: ["Water", "DNA", "Protein", "Sugar"],
    correct: 1
  },
  {
    prompt: "A trait that shows up even if only one copy is present is called…",
    choices: ["Recessive", "Dominant", "Neutral", "Hidden"],
    correct: 1
  },
  {
    prompt: "What is a genotype?",
    choices: ["Physical appearance", "The genetic makeup", "A learned behavior", "A mutation"],
    correct: 1
  },
  {
    prompt: "What is a phenotype?",
    choices: ["The genetic code", "The visible trait", "A chromosome", "A recessive gene"],
    correct: 1
  },
  {
    prompt: "What tool shows possible genetic outcomes?",
    choices: ["Microscope", "Punnett square", "Thermometer", "Graph"],
    correct: 1
  }
]);

export const evolutionDeck = makeDeck(4, "Evolution", [
  {
    prompt: "What is evolution?",
    choices: [
      "Sudden change in one organism",
      "Change in species over time",
      "A natural disaster",
      "A type of mutation"
    ],
    correct: 1
  },
  {
    prompt: "What is natural selection?",
    choices: [
      "Random mating",
      "Survival of organisms best suited to the environment",
      "Choosing pets",
      "A type of fossil"
    ],
    correct: 1
  },
  {
    prompt: "What are adaptations?",
    choices: [
      "Traits that help organisms survive",
      "Traits that harm organisms",
      "Traits learned in school",
      "Traits caused by weather"
    ],
    correct: 0
  },
  {
    prompt: "Fossils provide evidence of…",
    choices: ["Weather patterns", "Ancient life", "Modern technology", "Plant growth"],
    correct: 1
  },
  {
    prompt: "What can cause a species to go extinct?",
    choices: [
      "Too much food",
      "Perfect adaptation",
      "Failure to survive environmental changes",
      "Extra DNA"
    ],
    correct: 2
  }
]);

export const environmentalScienceDeck = makeDeck(5, "Environmental Science", [
  {
    prompt: "What is an ecosystem?",
    choices: [
      "A single organism",
      "A group of rocks",
      "A community of living and nonliving things",
      "A weather pattern"
    ],
    correct: 2
  },
  {
    prompt: "What do producers do?",
    choices: ["Eat other animals", "Break down dead matter", "Make their own food", "Hunt prey"],
    correct: 2
  },
  {
    prompt: "What is a food chain?",
    choices: [
      "A list of animals",
      "A map of the Earth",
      "A path showing how energy moves",
      "A type of ecosystem"
    ],
    correct: 2
  },
  {
    prompt: "Which resource can be replaced naturally?",
    choices: ["Coal", "Oil", "Natural gas", "Solar energy"],
    correct: 3
  },
  {
    prompt: "What is pollution?",
    choices: [
      "Clean air",
      "Harmful substances in the environment",
      "Recycled materials",
      "Natural resources"
    ],
    correct: 1
  }
]);
