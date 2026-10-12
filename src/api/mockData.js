// In-memory curriculum and demo data for Abhyasa platform
export const mockBoards = [
  { _id: "b_cbse", name: "CBSE" },
  { _id: "b_icse", name: "ICSE" },
  { _id: "b_state", name: "State Board" },
];

export const mockGrades = [
  { _id: "g_cbse_10", grade: 10, board: "b_cbse" },
  { _id: "g_cbse_9", grade: 9, board: "b_cbse" },
  { _id: "g_cbse_8", grade: 8, board: "b_cbse" },
  { _id: "g_icse_10", grade: 10, board: "b_icse" },
  { _id: "g_icse_9", grade: 9, board: "b_icse" },
  { _id: "g_icse_8", grade: 8, board: "b_icse" },
  { _id: "g_state_10", grade: 10, board: "b_state" },
  { _id: "g_state_9", grade: 9, board: "b_state" },
  { _id: "g_state_8", grade: 8, board: "b_state" },
];

export const mockSubjects = [
  { _id: "s_bio_cbse_10", name: "Biology", board: "b_cbse", grade: 10 },
  { _id: "s_chem_cbse_10", name: "Chemistry", board: "b_cbse", grade: 10 },
  { _id: "s_phy_cbse_10", name: "Physics", board: "b_cbse", grade: 10 },
  { _id: "s_math_cbse_10", name: "Mathematics", board: "b_cbse", grade: 10 },
  { _id: "s_geo_cbse_10", name: "Geography", board: "b_cbse", grade: 10 },
  { _id: "s_hist_cbse_10", name: "History", board: "b_cbse", grade: 10 },
  { _id: "s_bio_icse_10", name: "Biology", board: "b_icse", grade: 10 },
  { _id: "s_chem_icse_10", name: "Chemistry", board: "b_icse", grade: 10 },
  { _id: "s_phy_icse_10", name: "Physics", board: "b_icse", grade: 10 },
  { _id: "s_math_icse_10", name: "Mathematics", board: "b_icse", grade: 10 },
];

export const mockChapters = [
  {
    _id: "ch_bio_1",
    number: 1,
    title: "Life Processes",
    name: "Life Processes",
    subject: "s_bio_cbse_10",
    videoUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    content: `# Chapter 1: Life Processes

Life processes are the fundamental biological mechanisms by which organisms maintain equilibrium and survive.

### Key Topics:
- **Nutrition**: Autotrophic (Photosynthesis in green plants) and Heterotrophic (Holozoic, Saprophytic, Parasitic).
- **Respiration**: Aerobic respiration (yields 38 ATP per glucose molecule) vs. Anaerobic respiration (fermentation).
- **Transportation**: Human circulatory system with double circulation, xylem & phloem vascular bundles in plants.
- **Excretion**: Nephron functional units in human kidneys, formation and concentration of urine.

> *Tip: Understanding stomatal opening/closing mechanisms is frequently tested in board examinations.*`,
    contentPreview: [
      {
        _id: "q_bio_1_1",
        question: "What is the primary function of chlorophyll in photosynthesis?",
        options: [
          "Absorbing light energy",
          "Splitting water directly into oxygen",
          "Storing synthesized glucose",
          "Releasing carbon dioxide"
        ],
        answer: 0,
        reason: "Chlorophyll pigments absorb specific wavelengths of photon energy to initiate the photolysis of water during light reactions."
      },
      {
        _id: "q_bio_1_2",
        question: "In amoeba, food is ingested with the help of which cellular structure?",
        options: [
          "Pseudopodia",
          "Cilia",
          "Flagella",
          "Contractile vacuole"
        ],
        answer: 0,
        reason: "Amoeba extends temporary finger-like projections called pseudopodia to engulf food particles into a food vacuole."
      },
      {
        _id: "q_bio_1_3",
        question: "Which blood vessel carries oxygenated blood from the lungs to the heart?",
        options: [
          "Pulmonary vein",
          "Pulmonary artery",
          "Aorta",
          "Vena cava"
        ],
        answer: 0,
        reason: "The pulmonary vein is unique among veins as it carries freshly oxygenated blood from pulmonary capillaries back to the left atrium."
      }
    ]
  },
  {
    _id: "ch_bio_2",
    number: 2,
    title: "Control and Coordination",
    name: "Control and Coordination",
    subject: "s_bio_cbse_10",
    videoUrl: "",
    content: `# Chapter 2: Control and Coordination

Examines how animals and plants coordinate their responses through nervous impulses and hormonal secretions.

### Focus Areas:
- Human Brain Anatomy: Forebrain (Cerebrum), Midbrain, and Hindbrain (Cerebellum, Pons, Medulla Oblongata).
- Reflex Arc: Sensory receptor -> Sensory neuron -> Relay neuron in spinal cord -> Motor neuron -> Effector muscle.
- Plant Hormones (Phytohormones): Auxins, Gibberellins, Cytokinins, Abscisic acid (stress hormone).`,
    contentPreview: [
      {
        _id: "q_bio_2_1",
        question: "Which plant hormone promotes cell division and is concentrated in fruits and seeds?",
        options: ["Cytokinins", "Auxins", "Abscisic acid", "Ethylene"],
        answer: 0,
        reason: "Cytokinins stimulate cytokinesis (cell division) and delay leaf senescence."
      },
      {
        _id: "q_bio_2_2",
        question: "Which part of the brain maintains posture, balance, and equilibrium?",
        options: ["Cerebellum", "Cerebrum", "Hypothalamus", "Medulla"],
        answer: 0,
        reason: "The cerebellum coordinates voluntary muscular activity and maintains bodily posture and equilibrium."
      }
    ]
  },
  {
    _id: "ch_chem_1",
    number: 1,
    title: "Chemical Reactions and Equations",
    name: "Chemical Reactions and Equations",
    subject: "s_chem_cbse_10",
    videoUrl: "",
    content: `# Chapter 1: Chemical Reactions and Equations

A chemical reaction involves breaking old chemical bonds and forming new bonds to produce substances with novel characteristics.

### Types of Chemical Reactions:
1. **Combination Reaction**: $A + B \\rightarrow AB$
2. **Decomposition Reaction**: Thermal, Electrolytic, and Photochemical decomposition.
3. **Displacement Reaction**: More reactive metal displaces less reactive metal based on the reactivity series.
4. **Double Displacement**: Precipitation reactions & Neutralization.
5. **Redox Reactions**: Simultaneous oxidation (gain of oxygen / loss of electrons) and reduction.`,
    contentPreview: [
      {
        _id: "q_chem_1_1",
        question: "When magnesium ribbon burns in air with a dazzling white flame, what product is formed?",
        options: [
          "Magnesium oxide (white powder)",
          "Magnesium nitride only",
          "Magnesium carbonate",
          "Magnesium chloride"
        ],
        answer: 0,
        reason: "Magnesium reacts exothermically with atmospheric oxygen: 2Mg + O2 -> 2MgO."
      },
      {
        _id: "q_chem_1_2",
        question: "What type of reaction occurs when iron nails are dipped in blue copper sulphate solution?",
        options: [
          "Displacement reaction",
          "Combination reaction",
          "Double decomposition",
          "Neutralization reaction"
        ],
        answer: 0,
        reason: "Iron is more reactive than copper in the reactivity series, displacing copper and forming pale green iron(II) sulphate: Fe + CuSO4 -> FeSO4 + Cu."
      }
    ]
  },
  {
    _id: "ch_phy_1",
    number: 1,
    title: "Light - Reflection and Refraction",
    name: "Light - Reflection and Refraction",
    subject: "s_phy_cbse_10",
    videoUrl: "",
    content: `# Chapter 1: Light - Reflection and Refraction

Light travels in rectilinear propagation in homogeneous media and undergoes reflection at polished interfaces and refraction at boundary media.

### Essential Formulae:
- **Mirror Formula**: $\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}$
- **Magnification**: $m = -\\frac{v}{u} = \\frac{h_i}{h_o}$
- **Snell's Law of Refraction**: $\\frac{\\sin i}{\\sin r} = n$
- **Lens Formula**: $\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}$
- **Power of Lens**: $P = \\frac{1}{f \\text{ (in metres)}}$ (Dioptres)`,
    contentPreview: [
      {
        _id: "q_phy_1_1",
        question: "Which type of mirror is universally used as a rear-view mirror in motor vehicles?",
        options: [
          "Convex mirror",
          "Concave mirror",
          "Plane mirror",
          "Cylindrical mirror"
        ],
        answer: 0,
        reason: "Convex mirrors always provide an erect, diminished image and have a wide field of view."
      },
      {
        _id: "q_phy_1_2",
        question: "What is the SI unit of power of a lens?",
        options: [
          "Dioptre (D)",
          "Watt (W)",
          "Candela (cd)",
          "Lumen (lm)"
        ],
        answer: 0,
        reason: "Power of a lens is reciprocal of its focal length in metres and is measured in Dioptres (m^-1)."
      }
    ]
  },
  {
    _id: "ch_math_1",
    number: 1,
    title: "Real Numbers",
    name: "Real Numbers",
    subject: "s_math_cbse_10",
    videoUrl: "",
    content: `# Chapter 1: Real Numbers

Covers Euclid's Division Lemma and the Fundamental Theorem of Arithmetic.

### Core Concepts:
- Fundamental Theorem of Arithmetic: Every composite number can be expressed (factorized) as a product of primes uniquely.
- Relationship: $\\text{HCF}(a, b) \\times \\text{LCM}(a, b) = a \\times b$
- Proof of Irrationality: Proving $\\sqrt{2}, \\sqrt{3}, \\sqrt{5}$ are irrational numbers using proof by contradiction.`,
    contentPreview: [
      {
        _id: "q_math_1_1",
        question: "If HCF(a, b) = 12 and a * b = 1800, what is LCM(a, b)?",
        options: ["150", "120", "180", "160"],
        answer: 0,
        reason: "HCF * LCM = a * b => 12 * LCM = 1800 => LCM = 1800 / 12 = 150."
      }
    ]
  },
  {
    _id: "ch_geo_1",
    number: 1,
    title: "Resources and Development",
    name: "Resources and Development",
    subject: "s_geo_cbse_10",
    videoUrl: "",
    content: `# Chapter 1: Resources and Development

Explores natural resources, conservation practices, land utilization, and soil distribution in India.`,
    contentPreview: [
      {
        _id: "q_geo_1_1",
        question: "Which type of soil is predominantly found in the Deccan Trap (Basalt) region?",
        options: ["Black Soil (Regur)", "Alluvial Soil", "Laterite Soil", "Arid Soil"],
        answer: 0,
        reason: "Black soil, also known as Regur soil, is derived from weathered lava rocks and is ideal for cotton cultivation."
      }
    ]
  }
];
