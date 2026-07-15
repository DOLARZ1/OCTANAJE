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
    // ---- Tortas (variedad solicitada) ----
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
    F("Limonada", "Bebidas", 40, 0, 10, 0)
  ];

  N.FOODS = FOODS;
  N.FOOD_CATS = CATS;
})();
