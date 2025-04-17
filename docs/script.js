document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const landing = document.getElementById("landing");
  const quizContainer = document.getElementById("quiz-container");
  const questionEl = document.getElementById("question");
  const choicesEl = document.getElementById("choices");
  const feedbackEl = document.getElementById("feedback");
  const nextBtn = document.getElementById("nextBtn");
  const resultScreen = document.getElementById("result-screen");
  const scoreText = document.getElementById("scoreText");

  const questions = [
    {
      question: "What is Ground 1?",
      options: [
        "Landlord requires property as principal home",
        "Rent arrears over 2 months",
        "Tenant convicted of serious offence",
        "Tenant causes nuisance"
      ],
      answer: 0
    },
    {
      question: "Ground 2 relates to...",
      options: [
        "Anti-social behaviour",
        "Mortgage repossession",
        "Overcrowding",
        "Damage to property"
      ],
      answer: 1
    },
    {
      question: "What does Ground 3 cover?",
      options: [
        "Temporary holiday lets",
        "Student accommodation",
        "Rent arrears",
        "Right to Buy fraud"
      ],
      answer: 0
    },
    {
      question: "Ground 4 allows possession if...",
      options: [
        "The property was let by an educational institution and is needed for another worker",
        "The tenant was under 18",
        "The property was sub-let without consent",
        "It is used for a temporary holiday let"
      ],
      answer: 0
    },
    {
      question: "Ground 5 applies to...",
      options: [
        "A property owned by a religious body that is no longer required by the tenant for religious purposes",
        "Property owned by the NHS",
        "A property used for Buy-to-Let",
        "Rent arrears over 8 weeks"
      ],
      answer: 0
    },
    {
      question: "What is Ground 6?",
      options: [
        "Property needs redevelopment",
        "Tenancy started before 1989",
        "Home purchase with option to buy",
        "Tenant was under 18"
      ],
      answer: 0
    },
    {
      question: "Ground 7 allows eviction when...",
      options: [
        "The tenant dies",
        "Landlord is moving abroad",
        "The rent is reduced",
        "The lease is transferred"
      ],
      answer: 0
    },
    {
      question: "Ground 8 is used when...",
      options: [
        "Rent is unpaid over threshold",
        "Drugs are used in the property",
        "Landlord wants to redecorate",
        "Tenant smokes indoors"
      ],
      answer: 0
    }
  ];

  let currentQuestion = 0;
  let score = 0;

  startBtn.addEventListener("click", () => {
    landing.style.display = "none";
    resultScreen.style.display = "none";
    quizContainer.style.display = "flex";
    currentQuestion = 0;
    score = 0;
    showQuestion();
  });

  function showQuestion() {
    const q = questions[currentQuestion];
    questionEl.textContent = q.question;
    feedbackEl.textContent = "";
    nextBtn.style.display = "none";
    choicesEl.innerHTML = "";

    q.options.forEach((option, index) => {
      const btn = document.createElement("button");
      btn.textContent = option;
      btn.onclick = () => selectAnswer(index);
      choicesEl.appendChild(btn);
    });
  }

  function selectAnswer(index) {
    const correct = questions[currentQuestion].answer;
    if (index === correct) {
      feedbackEl.textContent = "Correct! " + (score + 1) + " of 8 correct.";
      score++;
    } else {
      feedbackEl.textContent = `Incorrect. Correct answer: "${questions[currentQuestion].options[correct]}".`;
    }

    Array.from(choicesEl.children).forEach(btn => btn.disabled = true);
    nextBtn.style.display = "inline-block";
  }

  nextBtn.addEventListener("click", () => {
    currentQuestion++;
    if (currentQuestion < questions.length) {
      showQuestion();
    } else {
      showResults();
    }
  });

  function showResults() {
    quizContainer.style.display = "none";
    resultScreen.style.display = "block";
    scoreText.textContent = `You got ${score} out of 8 correct.`;
  }

  window.goHome = function () {
    resultScreen.style.display = "none";
    landing.style.display = "flex";
  };

  window.startQuiz = function () {
    landing.style.display = "none";
    resultScreen.style.display = "none";
    quizContainer.style.display = "flex";
    currentQuestion = 0;
    score = 0;
    showQuestion();
  };

  window.nextQuestion = function () {
    currentQuestion++;
    if (currentQuestion < questions.length) {
      showQuestion();
    } else {
      showResults();
    }
  };
});
