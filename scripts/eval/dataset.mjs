// Small bilingual retrieval eval set. Each query lists the ids of relevant notes.
export const notes = [
  {
    id: "n01",
    lang: "en",
    text: "Grocery list: oat milk, spinach, cherry tomatoes, brown rice, and a block of feta cheese for the weekend salad.",
  },
  {
    id: "n02",
    lang: "pt",
    text: "Lista de compras: leite de aveia, espinafre, tomate cereja, arroz integral e um pedaço de queijo feta para a salada do fim de semana.",
  },
  {
    id: "n03",
    lang: "en",
    text: "Meeting with Priya about the Q3 roadmap: we agreed to postpone the mobile redesign and focus on offline sync and search quality first.",
  },
  {
    id: "n04",
    lang: "pt",
    text: "Reunião com o Marcelo sobre o planejamento do trimestre: decidimos adiar o redesign do app e priorizar a sincronização offline e a busca.",
  },
  {
    id: "n05",
    lang: "en",
    text: "Sourdough recipe: 500g bread flour, 350g water, 100g active starter, 10g salt. Fold every 30 minutes for two hours, then proof overnight in the fridge.",
  },
  {
    id: "n06",
    lang: "pt",
    text: "Receita de pão de queijo: 500g de polvilho azedo, 2 ovos, 200ml de leite, 100ml de óleo e 200g de queijo minas ralado. Assar a 200 graus por 25 minutos.",
  },
  {
    id: "n07",
    lang: "en",
    text: "Flight to Lisbon on March 14, departs 22:35 from Guarulhos, seat 31C. Remember to renew the passport before then and print the hotel booking.",
  },
  {
    id: "n08",
    lang: "pt",
    text: "Viagem para Florianópolis em julho: reservar a pousada na Lagoa da Conceição, alugar um carro e levar protetor solar e guarda-chuva.",
  },
  {
    id: "n09",
    lang: "en",
    text: "Book notes on Deep Work by Cal Newport: schedule long blocks of distraction-free focus, embrace boredom, and quit social media for a month as an experiment.",
  },
  {
    id: "n10",
    lang: "pt",
    text: "Anotações do livro Hábitos Atômicos: pequenas melhorias de 1% ao dia se acumulam, vincule o novo hábito a um já existente e torne o gatilho óbvio.",
  },
  {
    id: "n11",
    lang: "en",
    text: "Bug: the login form crashes on Safari when the password manager autofills the email field. Stack trace points to a null ref in useEffect cleanup.",
  },
  {
    id: "n12",
    lang: "pt",
    text: "Erro em produção: a API retorna 500 quando o campo CPF vem vazio. Precisa validar o payload antes de consultar o banco de dados e adicionar um teste de regressão.",
  },
  {
    id: "n13",
    lang: "en",
    text: "Workout plan: Monday squats and deadlifts, Wednesday pull-ups and rows, Friday overhead press and bench. Run 5km on Saturday, rest on Sunday.",
  },
  {
    id: "n14",
    lang: "pt",
    text: "Treino da semana: segunda peito e tríceps, quarta costas e bíceps, sexta pernas. Corrida leve de 30 minutos no sábado e alongamento todos os dias.",
  },
  {
    id: "n15",
    lang: "en",
    text: "Gift ideas for mom's birthday: a silk scarf, the new Isabel Allende novel, a ceramic planter for her herbs, or tickets to the botanical garden.",
  },
  {
    id: "n16",
    lang: "pt",
    text: "Ideias de presente para o aniversário do meu pai: uma camisa do Flamengo, um kit de churrasco com facas, ou um vinho tinto argentino.",
  },
  {
    id: "n17",
    lang: "en",
    text: "Monthly budget: rent 1800, groceries 450, transport 120, subscriptions 60. Try to move at least 300 into the emergency savings fund every month.",
  },
  {
    id: "n18",
    lang: "pt",
    text: "Declaração do imposto de renda: separar os informes de rendimentos, recibos médicos e comprovantes de despesas com educação antes do prazo de maio.",
  },
  {
    id: "n19",
    lang: "en",
    text: "Spanish vocabulary to review: aprovechar means to take advantage of, sobremesa is the time spent chatting after a meal, and madrugada is the early hours of the morning.",
  },
  {
    id: "n20",
    lang: "pt",
    text: "Vocabulário de inglês: 'thrive' significa prosperar, 'reluctant' é relutante, e 'bear with me' é uma expressão para pedir paciência a alguém.",
  },
  {
    id: "n21",
    lang: "en",
    text: "Dream last night: I was walking through a flooded library and the books were floating like lily pads. I woke up feeling oddly calm.",
  },
  {
    id: "n22",
    lang: "pt",
    text: "Ideia para o meu projeto pessoal: um aplicativo de notas que funciona offline e roda modelos de IA no próprio navegador, sem enviar nada para servidores.",
  },
  {
    id: "n23",
    lang: "en",
    text: "Doctor appointment on Thursday at 9am with Dr. Alvarez for the annual checkup. Bring the blood test results and the list of current medications.",
  },
  {
    id: "n24",
    lang: "pt",
    text: "Consulta no dentista na terça às 15h para limpeza e avaliação do siso. Levar o cartão do convênio e a radiografia anterior.",
  },
  {
    id: "n25",
    lang: "en",
    text: "Houseplant care: the monstera needs bright indirect light and watering every ten days; the snake plant tolerates neglect; mist the ferns daily.",
  },
  {
    id: "n26",
    lang: "pt",
    text: "Cuidados com o jardim: regar as samambaias toda manhã, podar a roseira no inverno e adubar o limoeiro com casca de ovo e borra de café.",
  },
  {
    id: "n27",
    lang: "en",
    text: "Movie recommendations from Sam: Arrival for a thoughtful sci-fi, Parasite for the social satire, and Spirited Away for something comforting.",
  },
  {
    id: "n28",
    lang: "pt",
    text: "Filmes para ver no fim de semana: Cidade de Deus, Central do Brasil e O Auto da Compadecida, que a Juliana recomendou muito.",
  },
  {
    id: "n29",
    lang: "en",
    text: "Kubernetes cheatsheet: kubectl get pods -n staging, kubectl logs -f deployment/api, kubectl rollout undo deployment/api to roll back a bad release.",
  },
  {
    id: "n30",
    lang: "pt",
    text: "Plano de estudos de machine learning: terminar o curso de álgebra linear, implementar uma regressão logística do zero e ler o capítulo sobre redes neurais.",
  },
];

// Queries: paraphrased / cross-lingual so they don't just match keywords.
export const queries = [
  // EN -> EN
  { q: "what should I buy for the salad this weekend", rel: ["n01", "n02"] },
  { q: "what did we decide about the product roadmap", rel: ["n03", "n04"] },
  { q: "how do I make bread with a starter", rel: ["n05"] },
  { q: "when does my flight leave", rel: ["n07"] },
  { q: "tips for focusing without distractions", rel: ["n09"] },
  { q: "browser crashes when autofill fills the email", rel: ["n11"] },
  { q: "which exercises do I do on Wednesday", rel: ["n13", "n14"] },
  { q: "present ideas for my mother", rel: ["n15"] },
  { q: "how much money should I save each month", rel: ["n17"] },
  { q: "what time is the checkup with the doctor", rel: ["n23"] },
  { q: "how often should I water the monstera", rel: ["n25", "n26"] },
  { q: "undo a bad deployment", rel: ["n29"] },
  { q: "strange dream about books and water", rel: ["n21"] },
  // PT -> PT
  { q: "o que comprar para a salada", rel: ["n01", "n02"] },
  {
    q: "o que ficou decidido sobre o planejamento do app",
    rel: ["n03", "n04"],
  },
  { q: "como fazer pão de queijo", rel: ["n06"] },
  { q: "lugar para ficar na ilha de Santa Catarina", rel: ["n08"] },
  { q: "como criar bons hábitos", rel: ["n10"] },
  { q: "erro 500 por falta de validação na API", rel: ["n12"] },
  { q: "qual é meu treino de sexta-feira", rel: ["n13", "n14"] },
  { q: "o que dar de aniversário para o pai", rel: ["n16"] },
  { q: "documentos para declarar o imposto", rel: ["n18"] },
  { q: "app de notas com inteligência artificial local", rel: ["n22"] },
  { q: "horário da consulta no dentista", rel: ["n24"] },
  { q: "quando podar as plantas do jardim", rel: ["n26"] },
  { q: "o que estudar para aprender aprendizado de máquina", rel: ["n30"] },
  // Cross-lingual
  { q: "dentist appointment", rel: ["n24"] },
  { q: "receita com queijo e polvilho", rel: ["n06"] },
  { q: "trip to Portugal passport", rel: ["n07"] },
  { q: "brazilian movies to watch", rel: ["n28"] },
  { q: "palavras novas em espanhol para revisar", rel: ["n19", "n20"] },
  { q: "reunião sobre roadmap de offline sync", rel: ["n03", "n04"] },
  { q: "personal project offline AI notes app", rel: ["n22"] },
  { q: "tax return paperwork", rel: ["n18"] },
  // Harder: indirect wording, little lexical overlap
  { q: "something to calm down after a stressful week", rel: ["n21"] },
  { q: "ways to cut down screen time", rel: ["n09"] },
  {
    q: "quando o relatório de exames do médico fica pronto e o que levar",
    rel: ["n23", "n24"],
  },
  {
    q: "lembrar de renovar documento antes de viajar para o exterior",
    rel: ["n07"],
  },
  { q: "plants that don't need much attention", rel: ["n25", "n26"] },
  { q: "pequenas mudanças diárias que geram grandes resultados", rel: ["n10"] },
  {
    q: "which note talks about running and lifting weights",
    rel: ["n13", "n14"],
  },
  { q: "dicas para não gastar demais e poupar dinheiro", rel: ["n17", "n18"] },
  { q: "software defect only reproducible in Apple's browser", rel: ["n11"] },
  { q: "curso para entender redes neurais", rel: ["n30"] },
  { q: "what to cook with dairy and flour", rel: ["n05", "n06"] },
  { q: "privacy-friendly note taking idea", rel: ["n22"] },
];
