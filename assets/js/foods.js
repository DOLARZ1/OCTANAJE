/* =====================================================================
   OCTANAJE · FOODS — base de datos nutricional (valores aproximados por 100 g)
   Campos: name, cat, kcal, prot (proteína g), carb (carbohidratos g),
   fat (grasas g) — los 4 macronutrientes completos.
   portion (opcional): { grams, label } → porción típica del platillo,
   para que en platillos compuestos (caldos, tortas, sushi, etc.) no
   tengas que adivinar gramos: eliges "porciones" y ya sabe cuánto pesa.
   Los valores son estimados con fines informativos.
   ===================================================================== */
(function () {
  "use strict";
  const N = window.NEXUS || (window.NEXUS = {});

  const CATS = [
    "Carnes y proteínas", "Frutas", "Verduras", "Cereales y panes",
    "Lácteos", "Platillos mexicanos", "Caldos y sopas",
    "Comida china y sushi", "Comida rápida", "Snacks / chatarra", "Bebidas"
  ];

  // fat: gramos de grasa por 100 g/ml (4º macronutriente).
  // unit (opcional, 8º parámetro): fuerza "ml" para alimentos que son
  // líquidos aunque vivan en una categoría que normalmente no es de bebidas
  // (ej. la leche está en "Lácteos", pero se mide en mililitros).
  const F = (name, cat, kcal, prot, carb, fat, portion, unit) => {
    const o = { name, cat, kcal, prot, carb, fat: fat == null ? 0 : fat };
    if (portion) o.portion = portion;
    if (unit) o.unit = unit;
    return o;
  };
  
  // atajo para crear la porción típica de un platillo
  const P = (grams, label) => ({ grams, label: label || (grams + " g aprox.") });

  // Helper para agregar alimentos con los valores totales por PORCIÓN de la Guía Nutricional.
  // Automáticamente hace la regla de 3 para convertirlos a los valores por 100g que exige el sistema.
  const FP = (name, cat, kcal, prot, carb, fat, grams, label, unit) => {
    const factor = 100 / grams;
    return F(
      name, cat,
      Math.round(kcal * factor),
      Math.round(prot * factor * 10) / 10,
      Math.round(carb * factor * 10) / 10,
      Math.round(fat * factor * 10) / 10,
      P(grams, label),
      unit
    );
  };

  const FOODS = [
    // ---------- Carnes y proteínas ----------
    F("Pechuga de pollo", "Carnes y proteínas", 165, 31, 0, 3.6),
    F("Muslo de pollo", "Carnes y proteínas", 209, 26, 0, 11),
    F("Carne de res magra", "Carnes y proteínas", 250, 26, 0, 15),
    F("Bistec de res", "Carnes y proteínas", 271, 25, 0, 19),
    F("Carne molida de res", "Carnes y proteínas", 254, 26, 0, 17),
    F("Lomo de cerdo", "Carnes y proteínas", 242, 27, 0, 14),
    F("Chuleta de cerdo", "Carnes y proteínas", 231, 26, 0, 14),
    F("Chorizo", "Carnes y proteínas", 455, 24, 2, 38),
    F("Tocino", "Carnes y proteínas", 541, 37, 1.4, 42),
    F("Jamón", "Carnes y proteínas", 145, 21, 1.5, 5),
    F("Salchicha", "Carnes y proteínas", 300, 12, 2, 27),
    F("Tilapia", "Carnes y proteínas", 96, 20, 0, 1.7),
    F("Salmón", "Carnes y proteínas", 208, 20, 0, 13),
    F("Atún en agua", "Carnes y proteínas", 116, 26, 0, 1),
    F("Camarón", "Carnes y proteínas", 99, 24, 0, 0.3),
    F("Huevo", "Carnes y proteínas", 155, 13, 1.1, 11),
    F("Clara de huevo", "Carnes y proteínas", 52, 11, 0.7, 0.2),
    F("Espinazo de cerdo (cocido)", "Carnes y proteínas", 215, 22, 0, 14),
    F("Menudencias de pollo", "Carnes y proteínas", 172, 24, 0.6, 8),
    F("Arrachera", "Carnes y proteínas", 205, 26, 0, 11),
    F("Milanesa de res (sin empanizar)", "Carnes y proteínas", 210, 27, 0, 11),
    F("Pierna de cerdo horneada", "Carnes y proteínas", 230, 25, 1, 14),
    F("Costilla de cerdo BBQ", "Carnes y proteínas", 290, 22, 4, 21),
    F("Cecina / carne seca", "Carnes y proteínas", 235, 34, 0, 9),
    F("Hígado de res", "Carnes y proteínas", 175, 26, 3.9, 4.9),
    F("Pulpo", "Carnes y proteínas", 82, 15, 2.2, 1),
    F("Pescado blanco (huachinango)", "Carnes y proteínas", 100, 21, 0, 1.4),
    // ---- Huevos en todas sus variantes ----
    F("Huevo cocido (duro)", "Carnes y proteínas", 155, 13, 1.1, 11),
    F("Huevo estrellado (frito)", "Carnes y proteínas", 196, 14, 0.8, 15),
    F("Huevos revueltos", "Carnes y proteínas", 148, 10, 1.6, 11),
    F("Huevo poché / tibio", "Carnes y proteínas", 143, 12.5, 0.7, 10),
    F("Omelette de queso", "Carnes y proteínas", 180, 12, 2, 13, P(150, "1 omelette de 2 huevos (~150 g)")),
    F("Huevos con jamón", "Platillos mexicanos", 190, 14, 2, 13, P(180, "1 plato (~180 g)")),
    F("Huevos con chorizo", "Platillos mexicanos", 230, 13, 2, 18, P(200, "1 plato (~200 g)")),
    F("Huevos a la mexicana", "Platillos mexicanos", 140, 10, 4, 9, P(250, "1 plato (~250 g)")),
    F("Huevos divorciados", "Platillos mexicanos", 150, 8, 12, 9, P(350, "1 plato (~350 g)")),
    F("Huevos motuleños", "Platillos mexicanos", 160, 8, 14, 8, P(350, "1 plato (~350 g)")),
    F("Huevos con nopales", "Platillos mexicanos", 120, 9, 4, 7, P(250, "1 plato (~250 g)")),
    F("Torta de huevo", "Platillos mexicanos", 220, 9, 26, 9, P(250, "1 torta (~250 g)")),

    // ---------- Frutas ----------
    F("Manzana", "Frutas", 52, 0.3, 14, 0.2),
    F("Plátano", "Frutas", 89, 1.1, 23, 0.3),
    F("Naranja", "Frutas", 47, 0.9, 12, 0.1),
    F("Fresa", "Frutas", 32, 0.7, 8, 0.3),
    F("Uva", "Frutas", 69, 0.7, 18, 0.2),
    F("Sandía", "Frutas", 30, 0.6, 8, 0.2),
    F("Melón", "Frutas", 34, 0.8, 8, 0.2),
    F("Piña", "Frutas", 50, 0.5, 13, 0.1),
    F("Mango", "Frutas", 60, 0.8, 15, 0.4),
    F("Papaya", "Frutas", 43, 0.5, 11, 0.3),
    F("Pera", "Frutas", 57, 0.4, 15, 0.1),
    F("Durazno", "Frutas", 39, 0.9, 10, 0.3),
    F("Aguacate", "Frutas", 160, 2, 9, 15),
    F("Toronja", "Frutas", 42, 0.8, 11, 0.1),
    F("Kiwi", "Frutas", 61, 1.1, 15, 0.5),
    F("Guayaba", "Frutas", 68, 2.6, 14, 1),

    // ---------- Verduras ----------
    F("Brócoli", "Verduras", 34, 2.8, 7, 0.4),
    F("Zanahoria", "Verduras", 41, 0.9, 10, 0.2),
    F("Espinaca", "Verduras", 23, 2.9, 3.6, 0.4),
    F("Jitomate", "Verduras", 18, 0.9, 3.9, 0.2),
    F("Lechuga", "Verduras", 15, 1.4, 2.9, 0.2),
    F("Pepino", "Verduras", 16, 0.7, 3.6, 0.1),
    F("Cebolla", "Verduras", 40, 1.1, 9, 0.1),
    F("Papa", "Verduras", 77, 2, 17, 0.1),
    F("Camote", "Verduras", 86, 1.6, 20, 0.1),
    F("Chile jalapeño", "Verduras", 29, 0.9, 6, 0.4),
    F("Calabacita", "Verduras", 17, 1.2, 3.1, 0.3),
    F("Ejotes", "Verduras", 31, 1.8, 7, 0.2),
    F("Champiñón", "Verduras", 22, 3.1, 3.3, 0.3),
    F("Elote", "Verduras", 86, 3.2, 19, 1.2),
    F("Nopal", "Verduras", 16, 1.3, 3.3, 0.1),
    F("Esquites (elote preparado)", "Verduras", 130, 4, 20, 4, P(250, "1 vaso (~250 g)")),
    F("Elote preparado (con mayonesa y queso)", "Verduras", 175, 5, 22, 8, P(200, "1 elote (~200 g)")),

    // ---------- Cereales y panes ----------
    F("Arroz blanco cocido", "Cereales y panes", 130, 2.7, 28, 0.3),
    F("Arroz integral cocido", "Cereales y panes", 111, 2.6, 23, 0.9),
    F("Pan blanco", "Cereales y panes", 265, 9, 49, 3.3),
    F("Pan integral", "Cereales y panes", 247, 13, 41, 3.4),
    F("Tortilla de maíz", "Cereales y panes", 218, 5.7, 45, 2.6),
    F("Tortilla de harina", "Cereales y panes", 304, 8, 51, 7.5),
    F("Tortilla hecha a mano (maíz)", "Cereales y panes", 220, 5.5, 44, 2.7, P(30, "1 pieza (~30 g)")),
    F("Tortilla hecha a mano (harina)", "Cereales y panes", 298, 7.5, 50, 7.2, P(35, "1 pieza (~35 g)")),
    F("Baguette clásico (jamón y queso)", "Cereales y panes", 250, 11, 34, 7, P(220, "1 pieza (~220 g)")),
    F("Baguette de pollo", "Cereales y panes", 240, 14, 30, 6, P(220, "1 pieza (~220 g)")),
    F("Baguette caprese (jitomate y mozzarella)", "Cereales y panes", 230, 10, 32, 6, P(220, "1 pieza (~220 g)")),
    F("Baguette integral", "Cereales y panes", 265, 10, 50, 4, P(200, "1 pieza (~200 g)")),
    F("Avena", "Cereales y panes", 389, 17, 66, 7),
    F("Pasta cocida", "Cereales y panes", 131, 5, 25, 1.1),
    F("Frijol cocido", "Cereales y panes", 127, 9, 23, 0.5),
    F("Lenteja cocida", "Cereales y panes", 116, 9, 20, 0.4),
    F("Bolillo", "Cereales y panes", 270, 9, 53, 2.5, P(80, "1 pieza (~80 g)")),
    F("Telera", "Cereales y panes", 262, 8, 51, 2.7, P(90, "1 pieza (~90 g)")),
    F("Concha", "Cereales y panes", 380, 7, 62, 12, P(90, "1 pieza (~90 g)")),
    F("Croissant", "Cereales y panes", 406, 8, 45, 21, P(70, "1 pieza (~70 g)")),

    // ---------- Lácteos ----------
    F("Leche entera", "Lácteos", 61, 3.2, 4.8, 3.3, null, "ml"),
    F("Leche descremada", "Lácteos", 34, 3.4, 5, 0.1, null, "ml"),
    F("Leche deslactosada", "Lácteos", 45, 3.3, 4.9, 1.5, null, "ml"),
    F("Leche de almendras", "Lácteos", 15, 0.5, 0.6, 1.1, null, "ml"),
    F("Leche de soya", "Lácteos", 33, 2.9, 1.5, 1.8, null, "ml"),
    F("Yogur bebible", "Lácteos", 62, 2.5, 10, 1.5, null, "ml"),
    F("Yogur natural", "Lácteos", 59, 10, 3.6, 0.4),
    F("Queso panela", "Lácteos", 215, 18, 3, 15),
    F("Queso Oaxaca", "Lácteos", 350, 25, 3, 27),
    F("Queso manchego", "Lácteos", 350, 24, 2, 28),
    F("Queso asadero", "Lácteos", 330, 24, 2.5, 26),
    F("Crema", "Lácteos", 300, 2.5, 3, 30),
    F("Requesón", "Lácteos", 98, 11, 3.4, 4),

    // ---------- Platillos mexicanos ----------
    F("Tacos al pastor", "Platillos mexicanos", 220, 12, 18, 12, P(90, "1 taco (~90 g)")),
    F("Tacos de bistec", "Platillos mexicanos", 200, 14, 16, 9, P(90, "1 taco (~90 g)")),
    F("Tacos de canasta", "Platillos mexicanos", 230, 8, 22, 13, P(70, "1 taco (~70 g)")),
    F("Tacos de barbacoa", "Platillos mexicanos", 240, 15, 15, 14, P(90, "1 taco (~90 g)")),
    F("Quesadilla", "Platillos mexicanos", 280, 12, 26, 14, P(120, "1 quesadilla (~120 g)")),
    F("Enchiladas", "Platillos mexicanos", 180, 8, 20, 8, P(300, "3 piezas con salsa (~300 g)")),
    F("Chilaquiles", "Platillos mexicanos", 190, 6, 22, 9, P(300, "1 plato (~300 g)")),
    F("Tamal", "Platillos mexicanos", 230, 5, 30, 10, P(150, "1 pieza (~150 g)")),
    F("Guacamole", "Platillos mexicanos", 160, 2, 9, 15, P(80, "2 cucharadas (~80 g)")),
    F("Mole con pollo", "Platillos mexicanos", 160, 10, 12, 8, P(350, "1 plato (~350 g)")),
    F("Frijoles refritos", "Platillos mexicanos", 135, 6, 18, 4, P(150, "1 porción (~150 g)")),
    F("Sope", "Platillos mexicanos", 250, 7, 30, 11, P(100, "1 pieza (~100 g)")),
    F("Tostada", "Platillos mexicanos", 240, 8, 30, 9, P(100, "1 pieza (~100 g)")),
    F("Chile relleno", "Platillos mexicanos", 210, 9, 12, 14, P(180, "1 pieza (~180 g)")),
    F("Huevos rancheros", "Platillos mexicanos", 170, 9, 12, 10, P(300, "1 plato (~300 g)")),
    F("Carne asada", "Platillos mexicanos", 250, 26, 2, 16, P(200, "1 porción (~200 g)")),
    F("Birria de res", "Platillos mexicanos", 210, 18, 5, 13, P(350, "1 plato con caldo (~350 g)")),
    F("Tinga de pollo", "Platillos mexicanos", 175, 14, 8, 9, P(200, "1 porción (~200 g)")),
    F("Cochinita pibil", "Platillos mexicanos", 230, 18, 4, 15, P(200, "1 porción (~200 g)")),
    F("Tlayuda", "Platillos mexicanos", 230, 9, 24, 9, P(350, "1 tlayuda (~350 g)")),
    F("Aguachile de camarón", "Platillos mexicanos", 110, 15, 5, 3, P(250, "1 plato (~250 g)")),
    F("Ceviche de camarón", "Platillos mexicanos", 105, 14, 7, 2, P(250, "1 vaso/plato (~250 g)")),
    F("Flautas", "Platillos mexicanos", 260, 9, 24, 14, P(200, "3 piezas (~200 g)")),
    F("Gorditas", "Platillos mexicanos", 250, 8, 26, 12, P(120, "1 pieza (~120 g)")),
    F("Huarache", "Platillos mexicanos", 240, 9, 28, 10, P(280, "1 huarache (~280 g)")),
    F("Pambazo", "Platillos mexicanos", 300, 10, 34, 15, P(280, "1 pieza (~280 g)")),
    F("Molletes", "Platillos mexicanos", 260, 11, 28, 11, P(200, "1 porción (~200 g)")),
    F("Torta ahogada", "Platillos mexicanos", 240, 13, 26, 9, P(350, "1 torta con salsa (~350 g)")),
    F("Carnitas de puerco", "Platillos mexicanos", 280, 22, 0, 21, P(150, "1 porción (~150 g)")),
    F("Tacos de carnitas", "Platillos mexicanos", 235, 14, 17, 12, P(90, "1 taco (~90 g)")),
    F("Birria de chivo", "Platillos mexicanos", 220, 19, 5, 14, P(350, "1 plato con caldo (~350 g)")),
    F("Tacos de birria (con consomé)", "Platillos mexicanos", 260, 16, 18, 13, P(120, "1 taco con consomé (~120 g)")),
    F("Guacamayas", "Platillos mexicanos", 260, 14, 24, 11, P(220, "1 pieza (~220 g)")),
    F("Chicharrón en salsa verde", "Platillos mexicanos", 190, 15, 6, 12, P(250, "1 porción (~250 g)")),
    F("Barbacoa de borrego", "Platillos mexicanos", 235, 20, 3, 16, P(200, "1 porción (~200 g)")),
    F("Longaniza", "Platillos mexicanos", 320, 18, 3, 26),
    F("Tacos de longaniza", "Platillos mexicanos", 235, 12, 16, 15, P(90, "1 taco (~90 g)")),
    // ---- Tortas (variedad solicitada original) ----
    F("Torta de milanesa", "Platillos mexicanos", 260, 12, 28, 11, P(280, "1 torta (~280 g)")),
    F("Torta combinada", "Platillos mexicanos", 230, 11, 26, 9, P(260, "1 torta (~260 g)")),
    F("Torta hawaiana", "Platillos mexicanos", 245, 10, 28, 10, P(260, "1 torta (~260 g)")),
    F("Torta de chorizo", "Platillos mexicanos", 285, 10, 24, 15, P(250, "1 torta (~250 g)")),
    F("Torta de queso asadero", "Platillos mexicanos", 255, 12, 27, 11, P(240, "1 torta (~240 g)")),
    F("Torta mexicana", "Platillos mexicanos", 235, 11, 27, 9, P(270, "1 torta (~270 g)")),
    F("Torta de jamón", "Platillos mexicanos", 220, 10, 28, 7, P(230, "1 torta (~230 g)")),
    F("Torta de pierna", "Platillos mexicanos", 250, 13, 25, 10, P(260, "1 torta (~260 g)")),
    F("Torta de pollo", "Platillos mexicanos", 235, 13, 26, 8, P(260, "1 torta (~260 g)")),

    // ---------- Caldos y sopas ----------
    F("Caldo de pollo", "Caldos y sopas", 42, 4, 3, 1.6, P(350, "1 plato (~350 g)")),
    F("Caldo de res", "Caldos y sopas", 58, 5, 3, 2.8, P(350, "1 plato (~350 g)")),
    F("Caldo de hueso (medula)", "Caldos y sopas", 68, 5, 2, 4, P(350, "1 plato (~350 g)")),
    F("Consomé de espinazo", "Caldos y sopas", 72, 6, 3, 3.9, P(350, "1 plato (~350 g)")),
    F("Menudo", "Caldos y sopas", 68, 7, 5, 2.6, P(400, "1 plato (~400 g)")),
    F("Pozole", "Caldos y sopas", 90, 6, 9, 3.5, P(400, "1 plato (~400 g)")),
    F("Sopa de fideo", "Caldos y sopas", 55, 2, 9, 1.2, P(300, "1 plato (~300 g)")),
    F("Sopa de tortilla", "Caldos y sopas", 75, 3, 8, 3.4, P(300, "1 plato (~300 g)")),
    F("Sopa de lentejas", "Caldos y sopas", 90, 6, 14, 1, P(300, "1 plato (~300 g)")),
    F("Crema de elote", "Caldos y sopas", 95, 3, 12, 3.6, P(300, "1 plato (~300 g)")),

    // ---------- Comida china y sushi ----------
    F("Arroz frito estilo chino", "Comida china y sushi", 180, 4, 30, 4.5, P(300, "1 porción (~300 g)")),
    F("Chow mein", "Comida china y sushi", 150, 6, 20, 4.5, P(300, "1 porción (~300 g)")),
    F("Pollo agridulce", "Comida china y sushi", 180, 12, 18, 6, P(300, "1 porción (~300 g)")),
    F("Pollo con almendras", "Comida china y sushi", 195, 14, 12, 9, P(300, "1 porción (~300 g)")),
    F("Res con verduras (wok)", "Comida china y sushi", 140, 12, 8, 6, P(300, "1 porción (~300 g)")),
    F("Rollo primavera", "Comida china y sushi", 180, 4, 20, 8, P(80, "2 piezas (~80 g)")),
    F("Wonton frito", "Comida china y sushi", 250, 8, 25, 12, P(60, "3 piezas (~60 g)")),
    F("Sopa wonton", "Comida china y sushi", 55, 4, 6, 1.5, P(300, "1 plato (~300 g)")),
    F("Sushi rollo California", "Comida china y sushi", 150, 6, 22, 4, P(200, "8 piezas (~200 g)")),
    F("Sushi uramaki (camarón empanizado)", "Comida china y sushi", 175, 7, 23, 5.5, P(200, "8 piezas (~200 g)")),
    F("Sushi rollo philadelphia", "Comida china y sushi", 190, 7, 20, 8, P(200, "8 piezas (~200 g)")),
    F("Sashimi de salmón", "Comida china y sushi", 145, 20, 0, 7, P(90, "6 piezas (~90 g)")),
    F("Nigiri de atún", "Comida china y sushi", 140, 15, 18, 1, P(120, "6 piezas (~120 g)")),
    F("Gyozas / empanadillas", "Comida china y sushi", 210, 7, 22, 9, P(150, "6 piezas (~150 g)")),

    // ---------- Comida rápida ----------
    F("Hamburguesa", "Comida rápida", 254, 13, 30, 9, P(220, "1 pieza (~220 g)")),
    F("Hamburguesa con queso", "Comida rápida", 300, 15, 30, 13, P(240, "1 pieza (~240 g)")),
    F("Pizza (rebanada)", "Comida rápida", 266, 11, 33, 10, P(115, "1 rebanada (~115 g)")),
    F("Hot dog", "Comida rápida", 290, 10, 24, 17, P(150, "1 pieza (~150 g)")),
    F("Papas a la francesa", "Comida rápida", 312, 3.4, 41, 15, P(150, "1 orden chica (~150 g)")),
    F("Pollo frito", "Comida rápida", 246, 19, 8, 15, P(150, "1 pieza (~150 g)")),
    F("Nuggets de pollo", "Comida rápida", 296, 15, 16, 18, P(100, "6 piezas (~100 g)")),
    F("Burrito", "Comida rápida", 206, 8, 24, 8, P(250, "1 pieza (~250 g)")),
    F("Sándwich", "Comida rápida", 250, 11, 28, 9, P(180, "1 pieza (~180 g)")),
    F("Alitas", "Comida rápida", 290, 27, 1, 19, P(300, "6 piezas (~300 g)")),
    F("Sub / sándwich submarino", "Comida rápida", 260, 13, 30, 9, P(280, "1 pieza 15 cm (~280 g)")),

    // ---------- Snacks / chatarra ----------
    F("Papas fritas (bolsa)", "Snacks / chatarra", 536, 7, 53, 35),
    F("Nachos / Doritos", "Snacks / chatarra", 498, 7, 63, 26),
    F("Chocolate", "Snacks / chatarra", 546, 5, 61, 31),
    F("Galletas", "Snacks / chatarra", 480, 6, 64, 21),
    F("Dona", "Snacks / chatarra", 452, 5, 51, 25, P(60, "1 pieza (~60 g)")),
    F("Palomitas", "Snacks / chatarra", 387, 12, 78, 13),
    F("Cacahuates", "Snacks / chatarra", 567, 26, 16, 49),
    F("Helado", "Snacks / chatarra", 207, 3.5, 24, 11),
    F("Pastel", "Snacks / chatarra", 350, 5, 50, 14, P(100, "1 rebanada (~100 g)")),
    F("Churros", "Snacks / chatarra", 400, 5, 55, 18, P(50, "1 pieza (~50 g)")),
    F("Gomitas", "Snacks / chatarra", 396, 0, 98, 0),
    F("Chicharrón de cerdo", "Snacks / chatarra", 545, 61, 0, 45),
    F("Mazapán", "Snacks / chatarra", 460, 12, 45, 27, P(28, "1 pieza (~28 g)")),
    F("Obleas con cajeta", "Snacks / chatarra", 380, 3, 60, 12, P(40, "1 pieza (~40 g)")),

    // ---------- Bebidas (por 100 ml) ----------
    F("Agua", "Bebidas", 0, 0, 0, 0),
    F("Refresco de cola", "Bebidas", 42, 0, 11, 0),
    F("Refresco light", "Bebidas", 0, 0, 0, 0),
    F("Jugo de naranja", "Bebidas", 45, 0.7, 10, 0.2),
    F("Cerveza", "Bebidas", 43, 0.5, 3.6, 0),
    F("Michelada", "Bebidas", 45, 0.4, 4, 0.1, P(400, "1 vaso (~400 ml)")),
    F("Café negro", "Bebidas", 2, 0.1, 0, 0),
    F("Café con leche", "Bebidas", 55, 3, 6, 2),
    F("Té sin azúcar", "Bebidas", 1, 0, 0, 0),
    F("Leche con chocolate", "Bebidas", 83, 3, 11, 3),
    F("Bebida energética", "Bebidas", 45, 0, 11, 0),
    F("Agua de horchata", "Bebidas", 80, 1, 16, 1.5),
    F("Agua de jamaica", "Bebidas", 35, 0, 9, 0),
    F("Licuado de plátano", "Bebidas", 90, 3, 15, 2),
    F("Vino", "Bebidas", 83, 0.1, 2.6, 0),
    F("Limonada", "Bebidas", 40, 0, 10, 0),


    /* =======================================================================
       NUEVOS ALIMENTOS INTEGRADOS DESDE LA GUÍA NUTRICIONAL PROPORCIONADA
       (Se calculan automáticamente los macros a 100g para el motor de la app)
       ======================================================================= */

    // --- TORTAS (~250g promedio por pieza) ---
    FP("Torta de jamón (Guía)", "Platillos mexicanos", 450, 20, 50, 18, 250, "1 pieza (~250g)"),
    FP("Torta de milanesa de pollo", "Platillos mexicanos", 650, 35, 60, 28, 280, "1 pieza (~280g)"),
    FP("Torta de milanesa de res", "Platillos mexicanos", 680, 36, 58, 32, 280, "1 pieza (~280g)"),
    FP("Torta ahogada", "Platillos mexicanos", 550, 22, 55, 26, 350, "1 pieza con salsa (~350g)"),
    FP("Torta de pierna (Guía)", "Platillos mexicanos", 600, 30, 55, 28, 260, "1 pieza (~260g)"),
    FP("Torta cubana", "Platillos mexicanos", 850, 40, 65, 45, 350, "1 pieza (~350g)"),
    FP("Torta de tamal (guajolota)", "Platillos mexicanos", 480, 12, 65, 18, 250, "1 pieza (~250g)"),
    FP("Torta de chorizo (Guía)", "Platillos mexicanos", 620, 24, 50, 38, 250, "1 pieza (~250g)"),
    FP("Torta de pollo (Guía)", "Platillos mexicanos", 500, 28, 52, 20, 250, "1 pieza (~250g)"),
    FP("Torta de huevo (Guía)", "Platillos mexicanos", 420, 16, 48, 18, 250, "1 pieza (~250g)"),
    FP("Torta de frijol con queso", "Platillos mexicanos", 400, 15, 55, 14, 250, "1 pieza (~250g)"),
    FP("Torta de pastor", "Platillos mexicanos", 580, 26, 52, 30, 250, "1 pieza (~250g)"),

    // --- TACOS (~90g promedio por pieza) ---
    FP("Taco al pastor (Guía)", "Platillos mexicanos", 150, 9, 14, 7, 90, "1 pieza (~90g)"),
    FP("Taco de bistec (Guía)", "Platillos mexicanos", 160, 12, 12, 8, 90, "1 pieza (~90g)"),
    FP("Taco de carnitas (Guía)", "Platillos mexicanos", 180, 11, 12, 11, 90, "1 pieza (~90g)"),
    FP("Taco de pollo (Guía)", "Platillos mexicanos", 140, 11, 13, 6, 90, "1 pieza (~90g)"),
    FP("Taco de suadero (Guía)", "Platillos mexicanos", 170, 10, 12, 10, 90, "1 pieza (~90g)"),
    FP("Taco de chicharrón (Guía)", "Platillos mexicanos", 190, 8, 13, 13, 90, "1 pieza (~90g)"),
    FP("Taco de barbacoa (Guía)", "Platillos mexicanos", 175, 12, 12, 10, 90, "1 pieza (~90g)"),
    FP("Taco de pescado (estilo Baja)", "Platillos mexicanos", 200, 9, 20, 10, 110, "1 pieza (~110g)"),
    FP("Taco de canasta (Guía)", "Platillos mexicanos", 130, 5, 18, 6, 70, "1 pieza (~70g)"),
    FP("Taco dorado de papa", "Platillos mexicanos", 160, 3, 20, 9, 80, "1 pieza (~80g)"),
    FP("Taco de guisado (frijol)", "Platillos mexicanos", 120, 5, 18, 4, 100, "1 pieza (~100g)"),
    FP("Taco de lengua", "Platillos mexicanos", 175, 12, 11, 10, 90, "1 pieza (~90g)"),
    FP("Taco de cabeza", "Platillos mexicanos", 165, 11, 11, 9, 90, "1 pieza (~90g)"),
    FP("Taco de birria (Guía)", "Platillos mexicanos", 200, 14, 13, 12, 100, "1 pieza (~100g)"),

    // --- QUESADILLAS (~120g a 150g) ---
    FP("Quesadilla de queso (Guía)", "Platillos mexicanos", 300, 14, 24, 17, 120, "1 pieza (~120g)"),
    FP("Quesadilla de flor de calabaza", "Platillos mexicanos", 280, 12, 24, 15, 120, "1 pieza (~120g)"),
    FP("Quesadilla de huitlacoche", "Platillos mexicanos", 290, 12, 25, 16, 120, "1 pieza (~120g)"),
    FP("Quesadilla de champiñones", "Platillos mexicanos", 260, 11, 24, 13, 120, "1 pieza (~120g)"),
    FP("Quesadilla de picadillo", "Platillos mexicanos", 380, 18, 26, 22, 140, "1 pieza (~140g)"),
    FP("Quesadilla de pollo", "Platillos mexicanos", 350, 20, 24, 18, 140, "1 pieza (~140g)"),
    FP("Quesadilla de chicharrón prensado", "Platillos mexicanos", 400, 16, 24, 27, 140, "1 pieza (~140g)"),
    FP("Quesadilla de papa con chorizo", "Platillos mexicanos", 370, 13, 30, 22, 140, "1 pieza (~140g)"),
    FP("Sincronizada de jamón y queso", "Platillos mexicanos", 420, 20, 30, 24, 150, "1 pieza (~150g)"),

    // --- GUISADOS (~200g a 250g) ---
    FP("Picadillo (Guía)", "Platillos mexicanos", 320, 22, 12, 20, 200, "1 porción (~200g)"),
    FP("Chile relleno (Guía)", "Platillos mexicanos", 380, 14, 22, 26, 200, "1 porción (~200g)"),
    FP("Rajas con crema", "Platillos mexicanos", 280, 6, 14, 22, 200, "1 porción (~200g)"),
    FP("Mole con pollo (Guía)", "Platillos mexicanos", 420, 28, 20, 24, 250, "1 porción (~250g)"),
    FP("Pollo en salsa verde", "Platillos mexicanos", 300, 26, 8, 18, 200, "1 porción (~200g)"),
    FP("Pollo en pipián", "Platillos mexicanos", 380, 26, 14, 24, 200, "1 porción (~200g)"),
    FP("Carne en su jugo", "Platillos mexicanos", 350, 24, 10, 22, 250, "1 plato (~250g)"),
    FP("Bistec a la mexicana (Guía)", "Platillos mexicanos", 320, 26, 10, 18, 200, "1 porción (~200g)"),
    FP("Albóndigas en caldillo", "Platillos mexicanos", 300, 20, 14, 18, 250, "1 plato (~250g)"),
    FP("Cochinita pibil (Guía)", "Platillos mexicanos", 400, 26, 8, 28, 200, "1 porción (~200g)"),
    FP("Frijoles de la olla (Guía)", "Platillos mexicanos", 180, 10, 28, 3, 200, "1 plato (~200g)"),
    FP("Frijoles refritos (Guía)", "Platillos mexicanos", 220, 9, 30, 8, 150, "1 porción (~150g)"),
    FP("Chicharrón en salsa verde (Guía)", "Platillos mexicanos", 350, 18, 10, 26, 200, "1 porción (~200g)"),
    FP("Tinga de pollo (Guía)", "Platillos mexicanos", 300, 22, 16, 16, 200, "1 porción (~200g)"),
    FP("Nopales con huevo (Guía)", "Platillos mexicanos", 220, 12, 8, 15, 200, "1 porción (~200g)"),

    // --- PIZZAS (~115g por rebanada) ---
    FP("Pizza Margarita", "Comida rápida", 220, 9, 26, 9, 115, "1 rebanada (~115g)"),
    FP("Pizza Pepperoni", "Comida rápida", 280, 12, 26, 14, 115, "1 rebanada (~115g)"),
    FP("Pizza Hawaiana", "Comida rápida", 250, 11, 28, 10, 115, "1 rebanada (~115g)"),
    FP("Pizza de carnes frías", "Comida rápida", 300, 14, 26, 16, 115, "1 rebanada (~115g)"),
    FP("Pizza Vegetariana", "Comida rápida", 210, 8, 27, 8, 115, "1 rebanada (~115g)"),
    FP("Pizza Cuatro quesos", "Comida rápida", 310, 14, 25, 18, 115, "1 rebanada (~115g)"),
    FP("Pizza Mexicana", "Comida rápida", 290, 13, 26, 15, 115, "1 rebanada (~115g)"),

    // --- ENSALADAS (~200g a 250g) ---
    FP("Ensalada verde (sencilla)", "Verduras", 60, 2, 8, 2, 250, "1 porción (~250g)"),
    FP("Ensalada de nopales", "Verduras", 90, 4, 10, 4, 200, "1 porción (~200g)"),
    FP("Ensalada César con pollo", "Verduras", 380, 28, 14, 24, 250, "1 plato (~250g)"),
    FP("Ensalada de pollo", "Verduras", 320, 26, 10, 18, 250, "1 plato (~250g)"),
    FP("Ensalada de atún", "Verduras", 280, 22, 10, 16, 250, "1 plato (~250g)"),
    FP("Pico de gallo", "Verduras", 40, 1, 8, 0.5, 150, "1 porción (~150g)"),
    FP("Ensalada de jícama y naranja", "Verduras", 100, 1, 24, 0.3, 200, "1 porción (~200g)"),

    // --- REFRESCOS (355ml) ---
    FP("Coca-Cola (Lata)", "Bebidas", 150, 0, 39, 0, 355, "1 lata (355ml)", "ml"),
    FP("Coca-Cola sin azúcar", "Bebidas", 1, 0, 0, 0, 355, "1 lata (355ml)", "ml"),
    FP("Sprite", "Bebidas", 140, 0, 38, 0, 355, "1 lata (355ml)", "ml"),
    FP("Fanta naranja", "Bebidas", 160, 0, 42, 0, 355, "1 lata (355ml)", "ml"),
    FP("Manzanita Sol", "Bebidas", 150, 0, 40, 0, 355, "1 lata (355ml)", "ml"),
    FP("Sidral Mundet", "Bebidas", 150, 0, 39, 0, 355, "1 lata (355ml)", "ml"),
    FP("Jarritos (sabor)", "Bebidas", 170, 0, 45, 0, 355, "1 botella (355ml)", "ml"),
    FP("Squirt", "Bebidas", 150, 0, 40, 0, 355, "1 lata (355ml)", "ml"),
    FP("Boing", "Bebidas", 180, 0, 44, 0, 355, "1 cajita/vaso (355ml)", "ml"),

    // --- JUGOS (250ml) ---
    FP("Jugo de naranja natural (Guía)", "Bebidas", 110, 2, 26, 0.5, 250, "1 vaso (250ml)", "ml"),
    FP("Jugo de toronja", "Bebidas", 95, 1, 23, 0.3, 250, "1 vaso (250ml)", "ml"),
    FP("Jugo verde", "Bebidas", 90, 2, 20, 0.3, 250, "1 vaso (250ml)", "ml"),
    FP("Jugo de zanahoria", "Bebidas", 95, 2, 22, 0.4, 250, "1 vaso (250ml)", "ml"),
    FP("Jugo de piña", "Bebidas", 130, 0.5, 32, 0.2, 250, "1 vaso (250ml)", "ml"),
    FP("Jugo de betabel", "Bebidas", 90, 2, 20, 0.3, 250, "1 vaso (250ml)", "ml"),

    // --- LICUADOS (300ml) ---
    FP("Licuado de plátano (Guía)", "Bebidas", 220, 8, 38, 5, 300, "1 vaso (300ml)", "ml"),
    FP("Licuado de fresa", "Bebidas", 190, 7, 32, 4, 300, "1 vaso (300ml)", "ml"),
    FP("Licuado de avena", "Bebidas", 250, 9, 42, 6, 300, "1 vaso (300ml)", "ml"),
    FP("Licuado de papaya", "Bebidas", 180, 6, 32, 3, 300, "1 vaso (300ml)", "ml"),
    FP("Licuado de mamey", "Bebidas", 230, 6, 42, 4, 300, "1 vaso (300ml)", "ml"),
    FP("Licuado de chocolate", "Bebidas", 260, 9, 38, 8, 300, "1 vaso (300ml)", "ml"),

    // --- MALTEADAS (400ml) ---
    FP("Malteada de vainilla", "Bebidas", 420, 10, 60, 15, 400, "1 vaso gpo. (400ml)", "ml"),
    FP("Malteada de chocolate", "Bebidas", 460, 11, 65, 17, 400, "1 vaso gpo. (400ml)", "ml"),
    FP("Malteada de fresa", "Bebidas", 440, 10, 63, 15, 400, "1 vaso gpo. (400ml)", "ml"),
    FP("Malteada de Oreo", "Bebidas", 550, 10, 75, 22, 400, "1 vaso gpo. (400ml)", "ml"),
    FP("Malteada de cajeta", "Bebidas", 500, 9, 70, 20, 400, "1 vaso gpo. (400ml)", "ml"),

    // --- CALDOS (350ml a 400ml) ---
    FP("Caldo de pollo (Guía)", "Caldos y sopas", 180, 18, 12, 6, 350, "1 plato (350ml)", "ml"),
    FP("Caldo de res (Guía)", "Caldos y sopas", 220, 20, 14, 9, 350, "1 plato (350ml)", "ml"),
    FP("Caldo tlalpeño", "Caldos y sopas", 250, 22, 16, 10, 350, "1 plato (350ml)", "ml"),
    FP("Pozole rojo/verde", "Caldos y sopas", 380, 24, 30, 18, 400, "1 plato (400ml)", "ml"),
    FP("Menudo (Guía)", "Caldos y sopas", 320, 22, 18, 18, 400, "1 plato (400ml)", "ml"),
    FP("Caldo de camarón", "Caldos y sopas", 260, 20, 16, 12, 350, "1 plato (350ml)", "ml"),
    FP("Consomé de pollo (Guía)", "Caldos y sopas", 90, 8, 6, 3, 250, "1 taza (250ml)", "ml"),
    FP("Caldo de habas", "Caldos y sopas", 200, 10, 30, 5, 300, "1 plato (300ml)", "ml"),
    FP("Mole de olla", "Caldos y sopas", 340, 22, 20, 18, 350, "1 plato (350ml)", "ml"),

    // --- GORDITAS (120g) ---
    FP("Gordita de chicharrón prensado", "Platillos mexicanos", 280, 9, 26, 16, 120, "1 pieza (~120g)"),
    FP("Gordita de frijol", "Platillos mexicanos", 220, 7, 30, 8, 120, "1 pieza (~120g)"),
    FP("Gordita de picadillo", "Platillos mexicanos", 300, 14, 26, 16, 120, "1 pieza (~120g)"),
    FP("Gordita de queso", "Platillos mexicanos", 260, 10, 26, 13, 120, "1 pieza (~120g)"),
    FP("Gordita de nata", "Cereales y panes", 240, 6, 28, 12, 80, "1 pieza (~80g)"),
    FP("Gordita de pollo", "Platillos mexicanos", 270, 13, 26, 12, 120, "1 pieza (~120g)"),
    FP("Gordita de rajas con queso", "Platillos mexicanos", 250, 8, 27, 13, 120, "1 pieza (~120g)"),
    FP("Gordita de tinga", "Platillos mexicanos", 280, 13, 27, 14, 120, "1 pieza (~120g)"),

    // --- SOPES (100g) ---
    FP("Sope de frijol con queso", "Platillos mexicanos", 180, 6, 22, 8, 100, "1 pieza (~100g)"),
    FP("Sope de pollo", "Platillos mexicanos", 200, 10, 20, 9, 100, "1 pieza (~100g)"),
    FP("Sope de picadillo", "Platillos mexicanos", 220, 11, 20, 11, 100, "1 pieza (~100g)"),
    FP("Sope de chorizo", "Platillos mexicanos", 240, 9, 19, 15, 100, "1 pieza (~100g)"),
    FP("Sope de chicharrón", "Platillos mexicanos", 230, 8, 19, 14, 100, "1 pieza (~100g)"),

    // --- SOPAS AGUADAS (300ml) ---
    FP("Sopa de fideo (Guía)", "Caldos y sopas", 180, 5, 28, 6, 300, "1 plato (300ml)", "ml"),
    FP("Sopa de letras", "Caldos y sopas", 170, 5, 27, 5, 300, "1 plato (300ml)", "ml"),
    FP("Sopa de verduras (Guía)", "Caldos y sopas", 110, 4, 18, 3, 300, "1 plato (300ml)", "ml"),
    FP("Sopa de tortilla (Guía)", "Caldos y sopas", 220, 8, 24, 10, 300, "1 plato (300ml)", "ml"),
    FP("Sopa azteca", "Caldos y sopas", 230, 9, 22, 12, 300, "1 plato (300ml)", "ml"),
    FP("Sopa de lentejas (Guía)", "Caldos y sopas", 200, 12, 30, 3, 300, "1 plato (300ml)", "ml"),
    FP("Sopa de habas", "Caldos y sopas", 190, 10, 28, 4, 300, "1 plato (300ml)", "ml"),
    FP("Sopa de arroz (Guía)", "Caldos y sopas", 190, 4, 32, 5, 200, "1 porción (200g)", "g"),

    // --- CREMAS (300ml) ---
    FP("Crema de zanahoria", "Caldos y sopas", 160, 3, 20, 8, 300, "1 plato (300ml)", "ml"),
    FP("Crema de elote (Guía)", "Caldos y sopas", 240, 6, 30, 11, 300, "1 plato (300ml)", "ml"),
    FP("Crema de brócoli", "Caldos y sopas", 180, 5, 16, 11, 300, "1 plato (300ml)", "ml"),
    FP("Crema de espárragos", "Caldos y sopas", 170, 5, 14, 11, 300, "1 plato (300ml)", "ml"),
    FP("Crema de champiñones", "Caldos y sopas", 190, 4, 15, 13, 300, "1 plato (300ml)", "ml"),
    FP("Crema de chile poblano", "Caldos y sopas", 210, 5, 16, 14, 300, "1 plato (300ml)", "ml"),
    FP("Crema de calabaza", "Caldos y sopas", 170, 4, 18, 9, 300, "1 plato (300ml)", "ml"),

    // --- KFC ---
    FP("KFC Pechuga (Receta Original)", "Comida rápida", 380, 33, 11, 22, 170, "1 pieza (~170g)"),
    FP("KFC Muslo (Receta Original)", "Comida rápida", 250, 18, 6, 17, 120, "1 pieza (~120g)"),
    FP("KFC Pierna (Receta Original)", "Comida rápida", 150, 13, 4, 9, 70, "1 pieza (~70g)"),
    FP("KFC Alita (Receta Original)", "Comida rápida", 150, 10, 5, 10, 70, "1 pieza (~70g)"),
    FP("KFC Pechuga (Extra Crispy)", "Comida rápida", 470, 35, 17, 29, 170, "1 pieza (~170g)"),
    FP("KFC Muslo (Extra Crispy)", "Comida rápida", 340, 19, 12, 23, 120, "1 pieza (~120g)"),
    FP("KFC Pierna (Extra Crispy)", "Comida rápida", 190, 13, 8, 12, 70, "1 pieza (~70g)"),
    FP("KFC Alita (Extra Crispy)", "Comida rápida", 190, 11, 8, 12, 70, "1 pieza (~70g)"),
    FP("KFC Tiras de pollo (3 pzas)", "Comida rápida", 340, 24, 18, 19, 150, "3 piezas (~150g)"),
    FP("KFC Puré de papa con gravy", "Comida rápida", 130, 2, 17, 6, 150, "1 porción (~150g)"),
    FP("KFC Ensalada de col", "Comida rápida", 150, 1, 14, 10, 150, "1 porción (~150g)"),
    FP("KFC Biscuit (Pan)", "Comida rápida", 180, 3, 20, 10, 60, "1 pieza (~60g)"),
    FP("KFC Arroz a la jardinera", "Comida rápida", 160, 3, 30, 3, 150, "1 porción (~150g)"),

    // --- MCDONALD'S ---
    FP("McDonald's Hamburguesa sencilla", "Comida rápida", 250, 12, 30, 9, 120, "1 pieza (~120g)"),
    FP("McDonald's Cheeseburger", "Comida rápida", 300, 15, 31, 13, 140, "1 pieza (~140g)"),
    FP("McDonald's Big Mac", "Comida rápida", 550, 25, 45, 30, 220, "1 pieza (~220g)"),
    FP("McDonald's Cuarto de Libra", "Comida rápida", 520, 30, 40, 26, 200, "1 pieza (~200g)"),
    FP("McDonald's McPollo", "Comida rápida", 400, 16, 40, 19, 160, "1 pieza (~160g)"),
    FP("McDonald's Papas chicas", "Comida rápida", 230, 3, 30, 11, 75, "1 orden (~75g)"),
    FP("McDonald's Papas grandes", "Comida rápida", 480, 7, 63, 23, 150, "1 orden (~150g)"),
    FP("McDonald's McNuggets (6 pzas)", "Comida rápida", 270, 13, 17, 17, 100, "6 piezas (~100g)"),
    FP("McDonald's McFlurry Oreo", "Comida rápida", 510, 11, 80, 17, 200, "1 porción (~200g)"),
    FP("McDonald's Cono de vainilla", "Comida rápida", 200, 5, 32, 6, 100, "1 pieza (~100g)"),
    FP("McDonald's McMuffin de huevo", "Comida rápida", 300, 17, 30, 12, 150, "1 pieza (~150g)"),

    // --- BURGER KING ---
    FP("Burger King Whopper", "Comida rápida", 660, 28, 49, 40, 280, "1 pieza (~280g)"),
    FP("Burger King Whopper Jr.", "Comida rápida", 310, 13, 27, 17, 130, "1 pieza (~130g)"),
    FP("Burger King Hamburguesa sencilla", "Comida rápida", 240, 12, 28, 9, 110, "1 pieza (~110g)"),
    FP("Burger King Cheeseburger", "Comida rápida", 280, 14, 28, 13, 130, "1 pieza (~130g)"),
    FP("Burger King Chicken Royale", "Comida rápida", 570, 24, 52, 30, 200, "1 pieza (~200g)"),
    FP("Burger King Papas medianas", "Comida rápida", 340, 4, 44, 16, 110, "1 orden (~110g)"),
    FP("Burger King Aros de cebolla", "Comida rápida", 320, 4, 40, 16, 110, "1 orden (~110g)"),
    FP("Burger King Nuggets (8 pzas)", "Comida rápida", 340, 15, 20, 22, 120, "8 piezas (~120g)"),

    // --- STARBUCKS ---
    FP("Starbucks Café americano", "Bebidas", 15, 1, 3, 0, 591, "1 Venti (591ml)", "ml"),
    FP("Starbucks Latte (leche entera)", "Bebidas", 250, 13, 24, 10, 591, "1 Venti (591ml)", "ml"),
    FP("Starbucks Cappuccino", "Bebidas", 170, 9, 17, 7, 591, "1 Venti (591ml)", "ml"),
    FP("Starbucks Frappuccino de café", "Bebidas", 400, 5, 68, 15, 591, "1 Venti (591ml)", "ml"),
    FP("Starbucks Frappuccino Java Chip", "Bebidas", 470, 6, 74, 18, 591, "1 Venti (591ml)", "ml"),
    FP("Starbucks Caramel Macchiato", "Bebidas", 320, 11, 42, 12, 591, "1 Venti (591ml)", "ml"),
    FP("Starbucks Mocha con crema", "Bebidas", 400, 14, 50, 17, 591, "1 Venti (591ml)", "ml"),
    FP("Starbucks Chai Tea Latte", "Bebidas", 300, 8, 55, 7, 591, "1 Venti (591ml)", "ml"),
    FP("Starbucks Matcha Latte", "Bebidas", 280, 11, 42, 8, 591, "1 Venti (591ml)", "ml"),
    FP("Starbucks Croissant chocolate", "Cereales y panes", 340, 6, 38, 18, 80, "1 pieza (~80g)"),
    FP("Starbucks Muffin de arándano", "Cereales y panes", 380, 6, 54, 15, 100, "1 pieza (~100g)"),
    FP("Starbucks Emparedado huevo/jamón/queso", "Cereales y panes", 400, 20, 30, 22, 150, "1 pieza (~150g)"),
    FP("Starbucks Emparedado huevo/tocino", "Cereales y panes", 350, 18, 28, 18, 140, "1 pieza (~140g)"),
    FP("Starbucks Wrap pavo y espinaca", "Cereales y panes", 300, 20, 30, 12, 150, "1 pieza (~150g)"),
    FP("Starbucks Bagel con queso crema", "Cereales y panes", 380, 12, 55, 12, 120, "1 pieza (~120g)"),
    FP("Starbucks Panqué de plátano con nuez", "Cereales y panes", 420, 6, 55, 20, 100, "1 rebanada (~100g)"),

    // --- CARNES ASADAS ---
    FP("Arrachera asada", "Carnes y proteínas", 330, 34, 0, 21, 150, "1 porción (~150g)"),
    FP("Rib eye asado", "Carnes y proteínas", 400, 32, 0, 30, 150, "1 porción (~150g)"),
    FP("Costilla de res asada", "Carnes y proteínas", 380, 28, 0, 29, 150, "1 porción (~150g)"),
    FP("Bistec de res asado", "Carnes y proteínas", 300, 32, 0, 18, 150, "1 porción (~150g)"),
    FP("Pollo asado (pechuga)", "Carnes y proteínas", 250, 38, 0, 10, 150, "1 porción (~150g)"),
    FP("Chorizo asado (Guía)", "Carnes y proteínas", 350, 18, 3, 30, 100, "1 porción (~100g)"),
    FP("Longaniza asada", "Carnes y proteínas", 340, 17, 2, 29, 100, "1 porción (~100g)"),
    FP("Tira de asado", "Carnes y proteínas", 360, 26, 0, 28, 150, "1 porción (~150g)"),
    FP("Cecina asada", "Carnes y proteínas", 280, 30, 1, 17, 150, "1 porción (~150g)"),

    // --- SABRITAS Y CHATARRA ---
    FP("Sabritas originales", "Snacks / chatarra", 230, 3, 22, 15, 45, "1 bolsa (~45g)"),
    FP("Sabritas sal y limón", "Snacks / chatarra", 230, 3, 22, 15, 45, "1 bolsa (~45g)"),
    FP("Doritos nacho", "Snacks / chatarra", 220, 3, 27, 12, 45, "1 bolsa (~45g)"),
    FP("Cheetos torciditos", "Snacks / chatarra", 220, 3, 24, 13, 45, "1 bolsa (~45g)"),
    FP("Cheetos flamin' hot", "Snacks / chatarra", 220, 2, 23, 14, 45, "1 bolsa (~45g)"),
    FP("Ruffles queso", "Snacks / chatarra", 230, 3, 22, 15, 45, "1 bolsa (~45g)"),
    FP("Rancheritos", "Snacks / chatarra", 220, 3, 26, 12, 45, "1 bolsa (~45g)"),
    FP("Fritos", "Snacks / chatarra", 230, 3, 23, 15, 45, "1 bolsa (~45g)"),
    FP("Cheetos crujitos", "Snacks / chatarra", 210, 3, 25, 11, 45, "1 bolsa (~45g)"),
    FP("Papas Crujitos adobadas", "Snacks / chatarra", 210, 3, 25, 11, 45, "1 bolsa (~45g)"),
    FP("Churrumais", "Snacks / chatarra", 210, 3, 26, 11, 45, "1 bolsa (~45g)"),
    FP("Runners (sabor limón)", "Snacks / chatarra", 190, 3, 26, 8, 45, "1 bolsa (~45g)"),
    FP("Tostitos", "Snacks / chatarra", 200, 3, 27, 9, 45, "1 bolsa (~45g)"),
    FP("Galletas Emperador", "Snacks / chatarra", 260, 4, 30, 14, 50, "1 paquete (~50g)"),

    // --- ENERGÉTICAS ---
    FP("Red Bull", "Bebidas", 110, 0, 27, 0, 250, "1 lata (250ml)", "ml"),
    FP("Monster Energy", "Bebidas", 210, 0, 54, 0, 473, "1 lata (473ml)", "ml"),
    FP("Monster Ultra", "Bebidas", 10, 0, 3, 0, 473, "1 lata (473ml)", "ml"),
    FP("Boost Energy", "Bebidas", 160, 0, 41, 0, 355, "1 lata (355ml)", "ml"),
    FP("Vive100", "Bebidas", 90, 0, 22, 0, 355, "1 botella (355ml)", "ml"),
    FP("Gladiator", "Bebidas", 130, 0, 33, 0, 355, "1 lata (355ml)", "ml"),
    FP("Electrolit", "Bebidas", 125, 0, 31, 0, 625, "1 botella (625ml)", "ml"),

    // --- POSTRES (GELATINAS, FLANES, PASTELES) ---
    FP("Gelatina de agua (sabor)", "Snacks / chatarra", 80, 2, 18, 0, 150, "1 porción (~150g)"),
    FP("Gelatina de leche (mosaico)", "Snacks / chatarra", 180, 5, 24, 7, 150, "1 porción (~150g)"),
    FP("Gelatina de rompope", "Snacks / chatarra", 220, 6, 26, 10, 150, "1 porción (~150g)"),
    FP("Flan napolitano", "Snacks / chatarra", 280, 7, 40, 10, 150, "1 rebanada (~150g)"),
    FP("Flan de queso", "Snacks / chatarra", 320, 9, 38, 14, 150, "1 rebanada (~150g)"),
    FP("Flan de cajeta", "Snacks / chatarra", 300, 7, 42, 11, 150, "1 rebanada (~150g)"),
    FP("Crème caramel casero", "Snacks / chatarra", 260, 6, 36, 9, 150, "1 rebanada (~150g)"),
    FP("Pastel de chocolate", "Snacks / chatarra", 370, 5, 48, 18, 100, "1 rebanada (~100g)"),
    FP("Pastel de vainilla", "Snacks / chatarra", 340, 4, 46, 15, 100, "1 rebanada (~100g)"),
    FP("Pastel de tres leches", "Snacks / chatarra", 320, 6, 40, 14, 100, "1 rebanada (~100g)"),
    FP("Pastel de zanahoria", "Snacks / chatarra", 380, 5, 45, 20, 100, "1 rebanada (~100g)"),
    FP("Pastel Red velvet", "Snacks / chatarra", 390, 5, 50, 19, 100, "1 rebanada (~100g)"),
    FP("Pastel de elote", "Snacks / chatarra", 300, 6, 42, 12, 100, "1 rebanada (~100g)"),
    FP("Cheesecake", "Snacks / chatarra", 400, 7, 32, 27, 100, "1 rebanada (~100g)"),
    FP("Pastel de queso con fresa", "Snacks / chatarra", 380, 7, 38, 22, 100, "1 rebanada (~100g)"),

    // --- PANES MEXICANOS ---
    FP("Concha (Guía)", "Cereales y panes", 280, 6, 45, 9, 80, "1 pieza (~80g)"),
    FP("Cuernito (cuerno)", "Cereales y panes", 230, 5, 30, 10, 60, "1 pieza (~60g)"),
    FP("Dona (Guía)", "Cereales y panes", 260, 4, 30, 14, 60, "1 pieza (~60g)"),
    FP("Cochinito (marranito)", "Cereales y panes", 220, 4, 38, 6, 60, "1 pieza (~60g)"),
    FP("Oreja", "Cereales y panes", 300, 3, 32, 18, 60, "1 pieza (~60g)"),
    FP("Bigote", "Cereales y panes", 320, 5, 40, 16, 80, "1 pieza (~80g)"),
    FP("Polvorón", "Cereales y panes", 150, 2, 18, 8, 40, "1 pieza (~40g)"),
    FP("Mantecada", "Cereales y panes", 250, 4, 32, 12, 70, "1 pieza (~70g)"),
    FP("Bolillo (Guía)", "Cereales y panes", 160, 5, 32, 1, 60, "1 pieza (~60g)"),
    FP("Telera (Guía)", "Cereales y panes", 170, 5, 33, 1.5, 60, "1 pieza (~60g)"),
    FP("Pan de muerto", "Cereales y panes", 300, 7, 48, 9, 80, "1 pieza (~80g)"),
    FP("Rosca de reyes", "Cereales y panes", 320, 6, 45, 13, 100, "1 rebanada (~100g)"),
    FP("Chilindrina", "Cereales y panes", 270, 6, 42, 9, 80, "1 pieza (~80g)"),
    FP("Gendarme", "Cereales y panes", 240, 4, 35, 10, 80, "1 pieza (~80g)"),
    FP("Pan de elote", "Cereales y panes", 260, 4, 38, 10, 80, "1 rebanada (~80g)"),
    FP("Campechana", "Cereales y panes", 350, 4, 35, 21, 80, "1 pieza (~80g)"),
    FP("Volcán (pan)", "Cereales y panes", 290, 5, 38, 13, 80, "1 pieza (~80g)"),

    // --- PESCADOS Y MARISCOS ---
    FP("Pescado a la veracruzana", "Carnes y proteínas", 280, 30, 10, 13, 200, "1 porción (~200g)"),
    FP("Pescado empanizado", "Carnes y proteínas", 350, 26, 20, 18, 200, "1 filete (~200g)"),
    FP("Pescado a la plancha", "Carnes y proteínas", 220, 32, 1, 9, 200, "1 filete (~200g)"),
    FP("Pescado frito (entero)", "Carnes y proteínas", 400, 34, 5, 27, 250, "1 pieza (~250g)"),
    FP("Camarones al mojo de ajo", "Carnes y proteínas", 320, 28, 4, 20, 200, "1 porción (~200g)"),
    FP("Camarones a la diabla", "Carnes y proteínas", 300, 26, 8, 18, 200, "1 porción (~200g)"),
    FP("Camarones empanizados (6 pzas)", "Carnes y proteínas", 280, 18, 22, 14, 150, "6 piezas (~150g)"),
    FP("Coctel de camarón", "Platillos mexicanos", 220, 18, 26, 4, 250, "1 vaso (~250ml)", "ml"),
    FP("Ceviche de pescado (1 taza)", "Platillos mexicanos", 180, 20, 14, 4, 200, "1 plato (~200g)"),
    FP("Ceviche de camarón (1 taza)", "Platillos mexicanos", 190, 22, 14, 4, 200, "1 plato (~200g)"),
    FP("Aguachile", "Platillos mexicanos", 200, 22, 12, 6, 200, "1 porción (~200g)"),
    FP("Pulpo a las brasas", "Carnes y proteínas", 250, 28, 4, 12, 200, "1 porción (~200g)"),
    FP("Pulpo en su tinta", "Carnes y proteínas", 260, 26, 8, 13, 200, "1 porción (~200g)"),
    FP("Callo de hacha al natural", "Carnes y proteínas", 150, 20, 6, 4, 150, "1 porción (~150g)"),
    FP("Filete de pescado al mojo de ajo", "Carnes y proteínas", 260, 30, 3, 14, 200, "1 filete (~200g)"),
    FP("Tacos de camarón", "Platillos mexicanos", 180, 10, 16, 9, 90, "1 taco (~90g)"),
    FP("Tacos de pescado empanizado", "Platillos mexicanos", 190, 9, 18, 9, 90, "1 taco (~90g)"),
    FP("Cóctel de pulpo", "Platillos mexicanos", 210, 19, 20, 6, 250, "1 vaso (~250ml)", "ml"),
    FP("Mojarra frita (entera)", "Carnes y proteínas", 420, 35, 6, 28, 300, "1 mojarra (~300g)"),
    FP("Caldo de mariscos", "Caldos y sopas", 260, 20, 16, 12, 350, "1 plato (~350ml)", "ml"),
    FP("Zarandeado de pescado (media pza)", "Carnes y proteínas", 300, 32, 4, 16, 250, "1 porción (~250g)"),
    FP("Chicharrón de camarón", "Carnes y proteínas", 260, 16, 12, 17, 150, "1 porción (~150g)"),

    // --- TOSTADAS (100g) ---
    FP("Tostada de frijol con queso", "Platillos mexicanos", 170, 6, 22, 7, 100, "1 pieza (~100g)"),
    FP("Tostada de pollo", "Platillos mexicanos", 200, 12, 20, 8, 100, "1 pieza (~100g)"),
    FP("Tostada de tinga", "Platillos mexicanos", 210, 11, 21, 9, 100, "1 pieza (~100g)"),
    FP("Tostada de picadillo", "Platillos mexicanos", 220, 11, 20, 11, 100, "1 pieza (~100g)"),
    FP("Tostada de ceviche de pescado", "Platillos mexicanos", 190, 13, 20, 6, 100, "1 pieza (~100g)"),
    FP("Tostada de ceviche de camarón", "Platillos mexicanos", 195, 14, 20, 6, 100, "1 pieza (~100g)"),
    FP("Tostada de atún", "Platillos mexicanos", 200, 14, 19, 8, 100, "1 pieza (~100g)"),
    FP("Tostada de pata (pata de res)", "Platillos mexicanos", 210, 12, 18, 10, 100, "1 pieza (~100g)"),
    FP("Tostada de pierna (deshebrada)", "Platillos mexicanos", 220, 14, 18, 11, 100, "1 pieza (~100g)"),
    FP("Tostada de chicharrón prensado", "Platillos mexicanos", 240, 9, 19, 15, 100, "1 pieza (~100g)"),
    FP("Tostada de cochinita pibil", "Platillos mexicanos", 230, 13, 18, 12, 100, "1 pieza (~100g)"),
    FP("Tostada de camarón (coctel)", "Platillos mexicanos", 200, 13, 22, 6, 100, "1 pieza (~100g)"),
    FP("Tostada Sinaloense (camarón y pulpo)", "Platillos mexicanos", 250, 18, 22, 9, 120, "1 pieza (~120g)"),
    FP("Tostada de cueritos", "Platillos mexicanos", 180, 7, 22, 7, 100, "1 pieza (~100g)")
  ];

  N.FOODS = FOODS;
  N.FOOD_CATS = CATS;
})();
