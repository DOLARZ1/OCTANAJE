/* =====================================================================
   OCTANAJE · Quotes — frases motivacionales (disciplina, hábitos, salud)
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS || (window.NEXUS = {});

  N.QUOTES = [
    { text: "La disciplina es elegir entre lo que quieres ahora y lo que quieres más.", author: "Abraham Lincoln" },
    { text: "No cuenta lo que haces una vez, cuenta lo que haces todos los días.", author: "Anónimo" },
    { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
    { text: "La motivación te hace empezar, el hábito te hace continuar.", author: "Jim Ryun" },
    { text: "Cada día es una nueva oportunidad para cambiar tu vida.", author: "Anónimo" },
    { text: "No esperes el momento perfecto, toma el momento y hazlo perfecto.", author: "Anónimo" },
    { text: "El cuerpo logra lo que la mente cree.", author: "Anónimo" },
    { text: "La constancia vence lo que la dicha no alcanza.", author: "Miguel de Cervantes" },
    { text: "Un pequeño progreso cada día suma grandes resultados.", author: "Anónimo" },
    { text: "Tu única competencia es la persona que fuiste ayer.", author: "Anónimo" },
    { text: "La disciplina es el puente entre metas y logros.", author: "Jim Rohn" },
    { text: "No se trata de tener tiempo, se trata de hacer tiempo.", author: "Anónimo" },
    { text: "El dolor que sientes hoy será la fuerza que sientas mañana.", author: "Anónimo" },
    { text: "Los hábitos de hoy son los resultados de mañana.", author: "Anónimo" },
    { text: "El esfuerzo que nadie ve es el que construye a la persona que todos admiran.", author: "Anónimo" },
    { text: "Actúa como si lo que haces marcara la diferencia. Marca la diferencia.", author: "William James" },
    { text: "El único mal entrenamiento es el que no hiciste.", author: "Anónimo" },
    { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
    { text: "La fuerza no viene de ganar. Tus luchas desarrollan tu fuerza.", author: "Arnold Schwarzenegger" },
    { text: "Cuida tu cuerpo, es el único lugar que tienes para vivir.", author: "Jim Rohn" },
    { text: "Nunca es tarde para ser quien quieres ser.", author: "F. Scott Fitzgerald" },
    { text: "El progreso, no la perfección, es lo que importa.", author: "Anónimo" },
    { text: "Levántate, arréglate, aparece y nunca te rindas.", author: "Anónimo" },
    { text: "Las metas grandes se logran con hábitos pequeños y constantes.", author: "James Clear" },
    { text: "No pares cuando estés cansado. Para cuando hayas terminado.", author: "Anónimo" },
    { text: "Cada minuto que pasas enojado, pierdes sesenta segundos de felicidad.", author: "Ralph Waldo Emerson" },
    { text: "Sé más fuerte que tu excusa más fuerte.", author: "Anónimo" },
    { text: "El futuro depende de lo que hagas hoy.", author: "Mahatma Gandhi" },
    { text: "La disciplina pesa gramos, el arrepentimiento pesa toneladas.", author: "Anónimo" },
    { text: "No busques motivación, construye disciplina.", author: "Anónimo" },
    { text: "Tu salud es una inversión, no un gasto.", author: "Anónimo" },
    { text: "Hazlo con miedo, hazlo cansado, pero hazlo.", author: "Anónimo" },
    { text: "El camino al éxito y el camino al fracaso son casi exactamente el mismo.", author: "Colin R. Davis" },
    { text: "Todo lo que siempre quisiste está al otro lado del miedo.", author: "George Addair" },
    { text: "La mente es lo primero que se rinde, entrénala también.", author: "Anónimo" },
    { text: "Sin esfuerzo, no hay progreso ni ganancia.", author: "Napoleon Hill" },
    { text: "Convierte tus heridas en sabiduría.", author: "Oprah Winfrey" },
    { text: "El que se levanta más veces gana, no el que nunca cae.", author: "Anónimo" },
    { text: "Nada cambia si nada cambia.", author: "Anónimo" },
    { text: "Un objetivo sin un plan es solo un deseo.", author: "Antoine de Saint-Exupéry" },
    { text: "La perseverancia no es una carrera larga; son muchas carreras cortas, una tras otra.", author: "Walter Elliot" },
    { text: "Cree que puedes y ya estás a mitad de camino.", author: "Theodore Roosevelt" },
    { text: "Tu futuro yo te está agradeciendo por lo que hagas hoy.", author: "Anónimo" },
    { text: "El descanso también es parte del entrenamiento.", author: "Anónimo" },
    { text: "No dejes para mañana lo que puedes disciplinar hoy.", author: "Anónimo" },
    { text: "La consistencia vence al talento cuando el talento no es consistente.", author: "Anónimo" },
    { text: "Enfócate en el progreso, no en la perfección.", author: "Anónimo" },
    { text: "Haz de la excelencia un hábito, no un acto.", author: "Aristóteles" },
    { text: "Cada racha comienza con un solo día. Hoy es ese día.", author: "Anónimo" },
    { text: "Las metas te dan dirección; los hábitos te dan el camino.", author: "Anónimo" },
    { text: "Invierte en ti mismo, es el activo que nunca pierde valor.", author: "Anónimo" },
    { text: "El mejor proyecto en el que trabajarás siempre serás tú mismo.", author: "Anónimo" },
    { text: "No se trata de ser el mejor, se trata de ser mejor que ayer.", author: "Anónimo" },

    // --- Disciplina y hábitos ---
    { text: "Somos lo que hacemos repetidamente. La excelencia no es un acto, es un hábito.", author: "Will Durant" },
    { text: "El hábito es más fuerte que la razón.", author: "George Santayana" },
    { text: "Primero formamos los hábitos, luego ellos nos forman a nosotros.", author: "Anónimo" },
    { text: "Motívate a ti mismo, disciplina a ti mismo y luego podrás disciplinar a otros.", author: "John Wooden" },
    { text: "La disciplina es hacer lo que odias hacer, pero hacerlo como si te encantara.", author: "Mike Tyson" },
    { text: "Sin disciplina no hay progreso, sin progreso no hay recompensa.", author: "Anónimo" },
    { text: "Todo lo que necesitas ya lo tienes: constancia y paciencia.", author: "Anónimo" },
    { text: "El que quiere puede, el que persiste consigue.", author: "Anónimo" },
    { text: "Grandes cosas nunca vienen de la comodidad.", author: "Anónimo" },
    { text: "Empieza donde estás, usa lo que tienes, haz lo que puedas.", author: "Arthur Ashe" },
    { text: "No importa lo lento que vayas, siempre estarás adelante de quien no empezó.", author: "Anónimo" },
    { text: "Un río corta a través de la roca no por su poder, sino por su persistencia.", author: "Jim Watkins" },
    { text: "El fracaso es el condimento que da sabor al éxito.", author: "Truman Capote" },
    { text: "La disciplina es la forma más alta de amor propio.", author: "Anónimo" },
    { text: "Cuando tengas ganas de rendirte, recuerda por qué empezaste.", author: "Anónimo" },
    { text: "Haz hoy lo que otros no harán, para tener mañana lo que otros no tendrán.", author: "Anónimo" },
    { text: "El orden y la constancia le dan estructura a los sueños.", author: "Anónimo" },
    { text: "El hábito convierte lo extraordinario en algo simplemente normal.", author: "James Clear" },
    { text: "La libertad más grande viene de la disciplina más grande.", author: "Anónimo" },
    { text: "Pequeñas decisiones diarias determinan quién serás en cinco años.", author: "Anónimo" },

    // --- Mente, enfoque y calma ---
    { text: "El enfoque es decir no a mil buenas ideas.", author: "Steve Jobs" },
    { text: "La concentración es la raíz de todas las capacidades del hombre.", author: "Bruce Lee" },
    { text: "Donde va la atención, va la energía.", author: "Anónimo" },
    { text: "Un momento de paciencia puede evitar un gran desastre.", author: "Proverbio chino" },
    { text: "La calma es el arma secreta de las personas exitosas.", author: "Anónimo" },
    { text: "Respira. Estás exactamente donde debes estar.", author: "Anónimo" },
    { text: "No puedes controlar todo, pero puedes controlar tu enfoque.", author: "Anónimo" },
    { text: "La claridad mental llega después de la acción, no antes.", author: "Anónimo" },
    { text: "Domina tu mente o ella te dominará a ti.", author: "Anónimo" },
    { text: "El silencio también es una respuesta poderosa.", author: "Anónimo" },
    { text: "Un minuto de pausa consciente vale más que una hora de estrés.", author: "Anónimo" },
    { text: "La paz interior comienza en el momento en que eliges no dejar que otra persona o evento controle tus emociones.", author: "Pema Chödrön" },

    // --- Finanzas y disciplina económica ---
    { text: "No ahorres lo que queda después de gastar, gasta lo que queda después de ahorrar.", author: "Warren Buffett" },
    { text: "No trabajes por dinero, haz que el dinero trabaje para ti.", author: "Robert Kiyosaki" },
    { text: "El riesgo viene de no saber lo que estás haciendo.", author: "Warren Buffett" },
    { text: "Un presupuesto te dice a dónde le dices a tu dinero que vaya.", author: "Dave Ramsey" },
    { text: "La riqueza consiste mucho más en el disfrute que en la posesión.", author: "Aristóteles" },
    { text: "Pequeños ahorros constantes construyen grandes fortunas.", author: "Anónimo" },
    { text: "Invertir en conocimiento siempre paga el mejor interés.", author: "Benjamin Franklin" },
    { text: "La disciplina financiera de hoy es la libertad financiera de mañana.", author: "Anónimo" },
    { text: "No mires el gasto pequeño; una pequeña filtración hundirá un gran barco.", author: "Benjamin Franklin" },
    { text: "Gasta menos de lo que ganas y evita las deudas innecesarias.", author: "Anónimo" },

    // --- Entrenamiento y cuerpo ---
    { text: "El único lugar donde el éxito llega antes del trabajo es en el diccionario.", author: "Vidal Sassoon" },
    { text: "Entrena tu mente como entrenas tu cuerpo.", author: "Anónimo" },
    { text: "El dolor es temporal, el orgullo de terminar es para siempre.", author: "Anónimo" },
    { text: "Tu cuerpo puede soportar casi todo. Es tu mente la que hay que convencer.", author: "Anónimo" },
    { text: "No hay atajos para ningún lugar que valga la pena llegar.", author: "Beverly Sills" },
    { text: "El sudor de hoy es la fuerza de mañana.", author: "Anónimo" },
    { text: "El único entrenamiento malo es el que no hiciste.", author: "Anónimo" },
    { text: "El movimiento es medicina para crear cambios en el estado físico, mental y emocional.", author: "Carol Welch" },
    { text: "La fuerza no es solo física, es la capacidad de superar cualquier dificultad.", author: "Anónimo" },
    { text: "Cuida tu cuerpo. Es el único que tienes.", author: "Jim Rohn" },

    // --- Alimentación y salud ---
    { text: "Que la comida sea tu medicina.", author: "Hipócrates" },
    { text: "Comer bien es un acto de amor propio.", author: "Anónimo" },
    { text: "Tu salud de hoy es el resultado de tus decisiones de ayer.", author: "Anónimo" },
    { text: "No hay atajos para una vida saludable, solo decisiones constantes.", author: "Anónimo" },
    { text: "El primer paso hacia el cambio es la conciencia; el segundo, la acción.", author: "Nathaniel Branden" },
    { text: "Comer con intención transforma tu energía y tu mente.", author: "Anónimo" },

    // --- Metas y crecimiento ---
    { text: "Un año a partir de ahora, desearás haber empezado hoy.", author: "Karen Lamb" },
    { text: "El futuro pertenece a quienes creen en la belleza de sus sueños.", author: "Eleanor Roosevelt" },
    { text: "No importa qué tan lento avances, siempre estás dejando atrás a los que se quedaron quietos.", author: "Anónimo" },
    { text: "El éxito no es definitivo, el fracaso no es fatal; lo que cuenta es el coraje de continuar.", author: "Winston Churchill" },
    { text: "Sueña en grande y atrévete a fallar.", author: "Norman Vaughan" },
    { text: "La única forma de hacer un gran trabajo es amar lo que haces.", author: "Steve Jobs" },
    { text: "El crecimiento comienza al final de tu zona de confort.", author: "Anónimo" },
    { text: "No dejes que lo que no puedes hacer interfiera con lo que sí puedes hacer.", author: "John Wooden" },
    { text: "Cada experto fue una vez un principiante que no se rindió.", author: "Anónimo" },
    { text: "El único límite para tu impacto es tu imaginación y compromiso.", author: "Tony Robbins" }
  ];

  // frase determinística según la fecha (cambia cada día) — con opción de
  // pasar un índice fijo para refrescar manualmente a otra frase distinta.
  N.pickQuote = function (dateKey, forcedIdx) {
    const n = N.QUOTES.length;
    if (typeof forcedIdx === "number") return N.QUOTES[((forcedIdx % n) + n) % n];
    let hash = 0;
    const str = String(dateKey || "");
    for (let i = 0; i < str.length; i++) { hash = (hash * 31 + str.charCodeAt(i)) >>> 0; }
    return N.QUOTES[hash % n];
  };
})();
