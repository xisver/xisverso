import {
  MATERIALS,
  RECIPES,
  DECORATIONS,
  cookIngredients,
  purchaseIngredient,
  purchaseDecoration,
  getCookingProgress,
  type GameState,
  type CareResult,
  type MaterialId,
  type RecipeId,
  type DecorationId,
} from './domain/game';
import './experiences.css';

export interface ExperienceOptions {
  kitchen: HTMLDialogElement;
  shop: HTMLDialogElement;
  getState: () => GameState;
  commit: (result: CareResult) => void;
  onSound: (name: 'utensil' | 'mix' | 'cook' | 'purchase' | 'success') => void;
  onFeed: (id: RecipeId) => void;
}

const closeIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>';
const backIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m14 6-6 6 6 6M8 12h12"/></svg>';
const bookIcon =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1m0-14c3-2 6-2 9-1v14c-3-1-6-1-9 1V6Z"/></svg>';
const decorationSymbols: Record<DecorationId, string> = {
  flowers: '❀',
  lantern: '✧',
  fountain: '≋',
  bench: '▱',
  mushrooms: '♧',
  arch: '⌒',
};
const colorByMaterial: Record<string, string> = {
  berries: '#c66f72',
  grain: '#ceac64',
  kelp: '#6f9e8e',
  root: '#c79979',
  herb: '#78a16c',
  seeds: '#a58a57',
  carrot: '#df9967',
  mushroom: '#ba9382',
  coconut: '#b89877',
  honey: '#d5a74e',
  milk: '#f1eadb',
  cocoa: '#93735d',
};
const materialName = (id: MaterialId) => MATERIALS.find((item) => item.id === id)!.name;
const materialSymbol = (id: MaterialId) => MATERIALS.find((item) => item.id === id)!.symbol;
function ingredientArt(id: MaterialId, className = '') {
  return `<span class="ingredient-art ingredient-${id} ${className}" style="--ingredient-color:${colorByMaterial[id] ?? '#a9b57d'}" aria-hidden="true"><span>${materialSymbol(id)}</span></span>`;
}
function recipeSymbol(id: RecipeId) {
  return id === 'strange-food'
    ? '✦'
    : id.includes('soup') || id.includes('stew')
      ? '♨'
      : id.includes('cookie') || id.includes('bread')
        ? '◒'
        : '◡';
}

/** Full-screen local activities. Inventory changes only after a finished cooking action. */
export function mountExperiences(options: ExperienceOptions) {
  const { kitchen, shop } = options;
  let selected: MaterialId[] = [];
  let batch: MaterialId[] = [];
  let phase: 'select' | 'mix' | 'cook' | 'result' = 'select';
  let mixCount = 0;
  let cookingTimer: ReturnType<typeof setTimeout> | undefined;
  let flightTimer: ReturnType<typeof setTimeout> | undefined;
  let resultMessage = '';
  let bookOpen = false;
  let category: 'ingredients' | 'decoration' = 'ingredients';
  let disposed = false;
  let kitchenSignature = '';
  let shopSignature = '';
  let pointer: { id: number; x: number; y: number; distance: number } | undefined;
  let lastStroke = 0;

  kitchen.classList.add('experience-dialog', 'cooking-experience');
  shop.classList.add('experience-dialog', 'market-experience');
  kitchen.setAttribute('aria-labelledby', 'kitchen-title');
  shop.setAttribute('aria-labelledby', 'shop-title');
  kitchen.innerHTML = `
    <div class="experience-scene kitchen-scene">
      <header class="experience-header"><button class="experience-back" data-experience-close="kitchen" aria-label="Volver al refugio">${backIcon}<span>Refugio</span></button><div class="experience-heading"><span class="experience-eyebrow">UN POCO DE CARIÑO, A FUEGO LENTO</span><h2 id="kitchen-title">La cocina del refugio</h2></div><button id="open-recipe-book" class="recipe-book-toggle" aria-controls="recipe-book" aria-expanded="false">${bookIcon}<span>Recetario</span></button></header>
      <div class="kitchen-level"><span class="cooking-level-badge" id="cooking-level">1</span><div><strong>Tu nivel de cocina</strong><span id="cooking-xp"></span><div class="cooking-xp-track" role="progressbar" aria-label="Experiencia de cocina" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="cooking-xp-fill"></span></div></div><span class="level-flourish" aria-hidden="true">✧</span></div>
      <div class="cooking-layout">
        <aside class="pantry"><div class="pantry-heading"><span class="experience-eyebrow">TU PEQUEÑA DESPENSA</span><h3>¿Qué cocinamos?</h3><p>Elige hasta tres ingredientes.</p></div><div id="material-inventory" class="pantry-shelves"></div><p class="pantry-note">Puedes encontrar más en exploraciones y en la tienda.</p></aside>
        <section class="cooking-workspace" aria-label="Mesa de cocina"><div class="kitchen-window" aria-hidden="true"><span></span><i></i><b></b></div><div class="hanging-utensils" aria-hidden="true"><span>♧</span><span>⌘</span><span>♧</span></div><div class="workstation-intro"><span class="experience-eyebrow">PEQUEÑAS MEZCLAS, GRANDES DESCUBRIMIENTOS</span><h3 id="mix-heading">Una receta por descubrir.</h3><p id="mix-instruction">Añade ingredientes al cuenco y dale tu toque.</p></div><div class="cooking-table"><div id="cooking-bowl" class="cooking-bowl" role="group" aria-label="Cuenco para mezclar"><div class="bowl-steam" aria-hidden="true"><i></i><i></i><i></i></div><div class="bowl-inside"><span class="bowl-soup"></span><div id="bowl-ingredients" class="bowl-ingredients"></div></div><div class="bowl-front"></div><span class="wooden-spoon" aria-hidden="true"></span><div id="ingredient-flight" aria-hidden="true"></div></div><div class="table-shadow" aria-hidden="true"></div><div id="ingredient-slots" class="ingredient-slots" aria-label="Ingredientes de esta mezcla"></div><div class="mix-meter" hidden><span id="mix-meter-fill"></span></div><button id="cook-mix" class="experience-primary" disabled>Preparar mezcla <span aria-hidden="true">↗</span></button><button id="mix-step" class="experience-primary" hidden>Mezclar <span aria-hidden="true">↻</span></button><p id="cooking-feedback" class="cooking-feedback" role="status" aria-live="polite"></p></div><div id="cooking-result" class="cooking-result" hidden></div></section>
        <aside id="recipe-book" class="recipe-book" aria-labelledby="recipe-book-title" hidden><header><span class="experience-eyebrow">EL SABOR DE LOS DESCUBRIMIENTOS</span><h3 id="recipe-book-title">Tu recetario</h3><button class="book-close" id="close-recipe-book" aria-label="Cerrar recetario">${closeIcon}</button></header><p id="recipe-discoveries" class="recipe-discoveries"></p><div id="recipe-list" class="experience-recipes"></div></aside>
      </div>
      <section class="prepared-shelf"><div><span class="experience-eyebrow">HECHO CON CARIÑO</span><h3>Comida preparada</h3></div><div id="prepared-food" class="prepared-portions"></div></section>
    </div>`;
  shop.innerHTML = `
    <div class="experience-scene shop-scene"><header class="experience-header"><button class="experience-back" data-experience-close="shop" aria-label="Volver al refugio">${backIcon}<span>Refugio</span></button><div class="experience-heading"><span class="experience-eyebrow">COSAS PEQUEÑAS QUE HACEN HOGAR</span><h2 id="shop-title">La tienda de la esquina</h2></div><div class="market-wallet"><span aria-hidden="true">✧</span><strong id="shop-points">0</strong><small>puntos</small></div></header><div class="market-awning" aria-hidden="true"></div><div class="market-intro"><p>Algo rico para su pancita. Algo bonito para su mundo.</p><div class="market-tabs" role="tablist" aria-label="Secciones de la tienda"><button id="shop-category-ingredients" role="tab" aria-selected="true" aria-controls="ingredient-market" data-shop-category="ingredients">Ingredientes</button><button id="shop-category-decoration" role="tab" aria-selected="false" aria-controls="decoration-market" data-shop-category="decoration">Decoración</button></div></div><p id="shop-feedback" class="shop-feedback" role="status" aria-live="polite"></p><section id="ingredient-market" class="market-room" role="tabpanel" aria-labelledby="shop-category-ingredients"><div class="market-section-title"><h3>La despensa de las posibilidades</h3><p id="market-cooking-level"></p></div><div id="ingredient-products" class="market-shelves"></div></section><section id="decoration-market" class="market-room" role="tabpanel" aria-labelledby="shop-category-decoration" hidden><div class="market-section-title"><h3>Un refugio más tuyo</h3><p>Un pequeño detalle cambia todo el rincón.</p></div><div id="decoration-list" class="market-shelves decoration-shelves"></div></section><footer class="market-footnote">Consigue puntos jugando con tu mascota. Todas las compras usan puntos del juego.</footer></div>`;

  const k = <T extends HTMLElement = HTMLElement>(selector: string) =>
    kitchen.querySelector<T>(selector)!;
  const s = <T extends HTMLElement = HTMLElement>(selector: string) =>
    shop.querySelector<T>(selector)!;
  const countSelected = (id: MaterialId) => selected.filter((item) => item === id).length;
  const activeCooking = () => phase === 'mix' || phase === 'cook';

  function drawSelected() {
    k('#ingredient-slots').innerHTML = Array.from({ length: 3 }, (_, index) => {
      const id = selected[index];
      return id
        ? `<button class="ingredient-slot filled" data-remove-ingredient="${index}" aria-label="Quitar ${materialName(id)}" ${activeCooking() ? 'disabled' : ''}>${ingredientArt(id)}<span>${materialName(id)}</span><b aria-hidden="true">×</b></button>`
        : `<span class="ingredient-slot empty"><span aria-hidden="true">+</span><small>Ingrediente ${index + 1}</small></span>`;
    }).join('');
    k('#bowl-ingredients').innerHTML = selected
      .map((id, index) => ingredientArt(id, `bowl-item bowl-item-${index}`))
      .join('');
    k<HTMLButtonElement>('#cook-mix').disabled = !selected.length || activeCooking();
    k('#cook-mix').hidden = activeCooking();
    k('#mix-step').hidden = phase !== 'mix';
    k('.mix-meter').hidden = !activeCooking();
    k('#mix-meter-fill').style.width = `${phase === 'cook' ? 100 : mixCount * 25}%`;
    k('#cooking-bowl').dataset.phase = phase;
    kitchen.dataset.cookingPhase = phase;
    if (activeCooking()) {
      kitchen
        .querySelectorAll<HTMLButtonElement>('[data-add-ingredient], [data-recipe]')
        .forEach((button) => {
          button.disabled = true;
        });
    }
  }

  function renderKitchen() {
    if (disposed || activeCooking()) return;
    const state = options.getState();
    const progress = getCookingProgress(state);
    const signature = JSON.stringify([
      state.inventory,
      state.cooking,
      state.selectedFood,
      selected,
      bookOpen,
      phase,
      resultMessage,
    ]);
    if (signature === kitchenSignature) return;
    kitchenSignature = signature;
    // Another tab may have consumed a selected ingredient while this view was open.
    const accepted: MaterialId[] = [];
    for (const id of selected) {
      const material = MATERIALS.find((item) => item.id === id);
      if (
        material &&
        material.unlockLevel <= progress.level &&
        accepted.filter((item) => item === id).length < state.inventory.materials[id]
      )
        accepted.push(id);
    }
    selected = accepted;
    k('#cooking-level').textContent = String(progress.level);
    k('#cooking-xp').textContent =
      progress.level >= 6
        ? '¡Tu cocina ya tiene su propia magia!'
        : `${progress.current} / ${progress.needed} XP para el siguiente nivel`;
    k('#cooking-xp-fill').style.width = `${progress.progress}%`;
    k('.cooking-xp-track').setAttribute('aria-valuenow', String(Math.round(progress.progress)));
    k('#material-inventory').innerHTML = MATERIALS.map((material) => {
      const locked = material.unlockLevel > progress.level;
      const remaining = state.inventory.materials[material.id] - countSelected(material.id);
      return `<button class="pantry-ingredient ${locked ? 'ingredient-locked' : ''}" data-add-ingredient="${material.id}" aria-label="Añadir ${material.name}" ${locked || remaining < 1 || selected.length >= 3 ? 'disabled' : ''}>${ingredientArt(material.id)}<strong>${material.name}</strong><span>${locked ? `Nivel ${material.unlockLevel}` : 'En mochila'} <b id="material-${material.id}">${state.inventory.materials[material.id]}</b></span></button>`;
    }).join('');
    drawSelected();
    k('#recipe-book').hidden = !bookOpen;
    k('#open-recipe-book').setAttribute('aria-expanded', String(bookOpen));
    k('#recipe-discoveries').textContent =
      `${state.cooking.discovered.filter((id) => id !== 'strange-food').length} recetas descubiertas · Nivel ${progress.level}`;
    k('#recipe-list').innerHTML = RECIPES.filter((recipe) => recipe.id !== 'strange-food')
      .map((recipe) => {
        const locked = recipe.unlockLevel > progress.level;
        const discovered = state.cooking.discovered.includes(recipe.id);
        const ingredients = Object.entries(recipe.ingredients)
          .map(([id, amount]) => `${amount} ${materialName(id as MaterialId)}`)
          .join(' · ');
        const possible = Object.entries(recipe.ingredients).every(
          ([id, amount]) => state.inventory.materials[id as MaterialId] >= amount!,
        );
        return `<article class="book-recipe ${locked ? 'book-recipe-locked' : ''}" data-recipe-id="${recipe.id}"><span class="book-dish" aria-hidden="true">${locked ? '◇' : recipeSymbol(recipe.id)}</span><div><span class="book-recipe-level">${locked ? 'Se abre en el' : 'Cocina de'} nivel ${recipe.unlockLevel}</span><h4>${locked ? 'Un sabor por descubrir' : recipe.name}</h4><p>${locked ? 'Sigue cocinando para abrir esta página.' : discovered ? ingredients : 'Experimenta con tus ingredientes para descubrir esta receta.'}</p>${!locked && discovered ? `<small>+${recipe.hungerRelief} Apetito</small><button class="book-recipe-select" data-recipe="${recipe.id}" ${possible ? '' : 'disabled'}>Elegir receta</button>` : !locked ? '<small class="recipe-undiscovered">Aún por descubrir</small>' : ''}</div></article>`;
      })
      .join('');
    k('#prepared-food').innerHTML = RECIPES.map((recipe) => {
      const amount = state.inventory.food[recipe.id];
      return `<div class="prepared-portion ${amount ? '' : 'portion-empty'}" ${amount ? '' : 'hidden'}><span aria-hidden="true">${recipeSymbol(recipe.id)}</span><div><strong>${recipe.name}</strong><small><b id="food-${recipe.id}">${amount}</b> ${amount === 1 ? 'ración' : 'raciones'} · +${recipe.hungerRelief} Apetito</small></div><button data-experience-feed="${recipe.id}" ${amount ? '' : 'disabled'}>${state.selectedFood === recipe.id ? 'Elegida' : 'Llevar'}</button></div>`;
    }).join('');
    k('#cooking-feedback').textContent =
      resultMessage ||
      (selected.length
        ? `${selected.length}/3 ingredientes en el cuenco`
        : 'Cada combinación puede ser un nuevo descubrimiento.');
  }

  function renderShop() {
    if (disposed) return;
    const state = options.getState();
    const progress = getCookingProgress(state);
    const signature = JSON.stringify([
      state.coins,
      state.cooking.xp,
      state.inventory.materials,
      state.decorations,
      category,
    ]);
    if (signature === shopSignature) return;
    shopSignature = signature;
    s('#shop-points').textContent = String(state.coins);
    s('#market-cooking-level').textContent =
      `Cocina nivel ${progress.level} · Los ingredientes especiales se abren al progresar.`;
    s('#ingredient-market').hidden = category !== 'ingredients';
    s('#decoration-market').hidden = category !== 'decoration';
    s('#shop-category-ingredients').setAttribute(
      'aria-selected',
      String(category === 'ingredients'),
    );
    s('#shop-category-decoration').setAttribute('aria-selected', String(category === 'decoration'));
    s('#ingredient-products').innerHTML = MATERIALS.map((material) => {
      const locked = material.unlockLevel > progress.level;
      return `<article class="market-product ${locked ? 'product-locked' : ''}"><span class="product-tier">${locked ? '◇ ' : ''}Nivel ${material.unlockLevel}</span>${ingredientArt(material.id)}<h4>${material.name}</h4><p>${material.description}</p><span class="product-stock">En tu mochila: ${state.inventory.materials[material.id]}</span><button data-buy-ingredient="${material.id}" ${locked || state.coins < material.price ? 'disabled' : ''}>${locked ? `Cocina nivel ${material.unlockLevel}` : `Comprar · ${material.price} puntos`}</button></article>`;
    }).join('');
    s('#decoration-list').innerHTML = DECORATIONS.map((item) => {
      const owned = state.decorations.includes(item.id);
      return `<article class="market-product market-decoration"><span class="product-tier">Para tu refugio</span><span class="decoration-object decoration-${item.id}" aria-hidden="true">${decorationSymbols[item.id]}</span><h4>${item.name}</h4><p>${item.description}</p><button data-buy-decoration="${item.id}" ${owned || state.coins < item.price ? 'disabled' : ''}>${owned ? 'En tu refugio' : `Comprar · ${item.price} puntos`}</button></article>`;
    }).join('');
  }

  function addIngredient(id: MaterialId) {
    if (activeCooking() || selected.length >= 3) return;
    const state = options.getState();
    const material = MATERIALS.find((item) => item.id === id);
    if (
      !material ||
      material.unlockLevel > getCookingProgress(state).level ||
      state.inventory.materials[id] <= countSelected(id)
    )
      return;
    phase = 'select';
    resultMessage = '';
    k('#cooking-result').hidden = true;
    selected.push(id);
    options.onSound('utensil');
    k('#mix-heading').textContent = 'Un poquito de esto…';
    k('#mix-instruction').textContent = 'Elige hasta tres ingredientes y prepara tu mezcla.';
    renderKitchen();
    const flight = k('#ingredient-flight');
    clearTimeout(flightTimer);
    flight.innerHTML = ingredientArt(id);
    flight.classList.remove('ingredient-flying');
    void flight.offsetWidth;
    flight.classList.add('ingredient-flying');
    flightTimer = setTimeout(() => flight.classList.remove('ingredient-flying'), 650);
  }

  function startMix() {
    if (disposed || activeCooking() || !selected.length) return;
    batch = [...selected];
    phase = 'mix';
    mixCount = 0;
    resultMessage = '';
    k('#cooking-result').hidden = true;
    k('#mix-heading').textContent = 'El ingrediente secreto eres tú.';
    k('#mix-instruction').textContent = 'Mueve el dedo por el cuenco o pulsa Mezclar cuatro veces.';
    k('#cooking-feedback').textContent = 'Mezcla con la cuchara · 0/4';
    options.onSound('utensil');
    drawSelected();
    k<HTMLButtonElement>('#mix-step').focus();
  }

  function stir() {
    if (disposed || phase !== 'mix') return;
    mixCount++;
    options.onSound('mix');
    const bowl = k('#cooking-bowl');
    bowl.classList.remove('stir-action');
    void bowl.offsetWidth;
    bowl.classList.add('stir-action');
    k('#mix-meter-fill').style.width = `${mixCount * 25}%`;
    k('#cooking-feedback').textContent = `Mezcla con la cuchara · ${mixCount}/4`;
    if (mixCount < 4) return;
    phase = 'cook';
    drawSelected();
    k('#mix-heading').textContent = 'Ahora, a fuego lento.';
    k('#mix-instruction').textContent = 'Tu mezcla está tomando forma…';
    k('#cooking-feedback').textContent = 'Un último toque antes de servir.';
    options.onSound('cook');
    cookingTimer = setTimeout(finishCooking, 2000);
  }

  function finishCooking() {
    cookingTimer = undefined;
    if (disposed || phase !== 'cook' || !kitchen.open) return;
    const result = cookIngredients(options.getState(), batch, Date.now());
    phase = 'result';
    bookOpen = false;
    selected = [];
    batch = [];
    mixCount = 0;
    resultMessage = result.message;
    kitchenSignature = '';
    options.commit(result);
    renderKitchen();
    const recipe = RECIPES.find((item) => item.id === result.recipeId);
    k('#mix-heading').textContent = result.success
      ? 'Un plato lleno de cariño.'
      : 'Probemos otra mezcla.';
    k('#mix-instruction').textContent = result.success
      ? 'Tu siguiente descubrimiento ya está esperando.'
      : result.message;
    k('#cooking-result').hidden = !result.success;
    if (recipe && result.success) {
      k('#cooking-result').innerHTML =
        `<span class="cooked-dish" aria-hidden="true">${recipeSymbol(recipe.id)}</span><div><span class="experience-eyebrow">${result.discovered ? '¡NUEVA RECETA DESCUBIERTA!' : 'RECIÉN HECHO'}</span><h3>${recipe.name}</h3><p>+${recipe.hungerRelief} Apetito · +${result.xpGained ?? 0} XP de cocina</p></div><button class="experience-primary" data-experience-feed="${recipe.id}">Llevar a mi mascota</button>`;
      options.onSound('success');
      const serve = k<HTMLButtonElement>('#cooking-result button');
      serve.focus({ preventScroll: true });
      serve.scrollIntoView({
        block: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    }
  }

  function closeKitchen() {
    clearTimeout(cookingTimer);
    clearTimeout(flightTimer);
    cookingTimer = undefined;
    selected = [];
    batch = [];
    phase = 'select';
    mixCount = 0;
    pointer = undefined;
    resultMessage = '';
    kitchenSignature = '';
    k('#mix-heading').textContent = 'Una receta por descubrir.';
    k('#mix-instruction').textContent = 'Añade ingredientes al cuenco y dale tu toque.';
    k('#cooking-result').hidden = true;
    k('#cooking-bowl').classList.remove('stir-action');
    k('#ingredient-flight').classList.remove('ingredient-flying');
    drawSelected();
  }

  function kitchenClick(event: MouseEvent) {
    const target =
      event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!target || !kitchen.contains(target)) return;
    event.stopPropagation();
    if (target.disabled) return;
    if (target.dataset.experienceClose) {
      closeKitchen();
      kitchen.close();
      return;
    }
    if (target.id === 'open-recipe-book' || target.id === 'close-recipe-book') {
      bookOpen = target.id === 'open-recipe-book' ? !bookOpen : false;
      kitchenSignature = '';
      if (activeCooking()) {
        k('#recipe-book').hidden = !bookOpen;
        k('#open-recipe-book').setAttribute('aria-expanded', String(bookOpen));
      } else renderKitchen();
      return;
    }
    if (target.dataset.addIngredient) addIngredient(target.dataset.addIngredient as MaterialId);
    if (target.dataset.removeIngredient && !activeCooking()) {
      selected.splice(Number(target.dataset.removeIngredient), 1);
      resultMessage = '';
      renderKitchen();
    }
    if (target.dataset.recipe && !activeCooking()) {
      const state = options.getState();
      const recipe = RECIPES.find((item) => item.id === target.dataset.recipe);
      if (
        !recipe ||
        !state.cooking.discovered.includes(recipe.id) ||
        recipe.unlockLevel > getCookingProgress(state).level
      )
        return;
      selected = Object.entries(recipe.ingredients).flatMap(([id, amount]) =>
        Array.from({ length: amount! }, () => id as MaterialId),
      );
      if (selected.length > 3) {
        selected = [];
        return;
      }
      phase = 'select';
      bookOpen = false;
      resultMessage = '';
      k('#cooking-result').hidden = true;
      options.onSound('utensil');
      renderKitchen();
    }
    if (target.id === 'cook-mix') startMix();
    if (target.id === 'mix-step') stir();
    if (target.dataset.experienceFeed && !activeCooking()) {
      const id = target.dataset.experienceFeed as RecipeId;
      closeKitchen();
      kitchen.close();
      options.onFeed(id);
    }
  }

  function shopClick(event: MouseEvent) {
    const target =
      event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
    if (!target || !shop.contains(target)) return;
    event.stopPropagation();
    if (target.disabled) return;
    if (target.dataset.experienceClose) {
      shop.close();
      return;
    }
    if (target.dataset.shopCategory) {
      category = target.dataset.shopCategory as typeof category;
      renderShop();
      options.onSound('utensil');
      return;
    }
    let result: CareResult | undefined;
    if (target.dataset.buyIngredient)
      result = purchaseIngredient(
        options.getState(),
        target.dataset.buyIngredient as MaterialId,
        1,
        Date.now(),
      );
    if (target.dataset.buyDecoration)
      result = purchaseDecoration(
        options.getState(),
        target.dataset.buyDecoration as DecorationId,
        Date.now(),
      );
    if (!result) return;
    options.commit(result);
    shopSignature = '';
    renderShop();
    s('#shop-feedback').textContent = result.message;
    if (result.success) options.onSound('purchase');
  }

  function pointerDown(event: PointerEvent) {
    if (phase !== 'mix' || !event.isPrimary) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
    k('#cooking-bowl').setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId || phase !== 'mix') return;
    pointer.distance += Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (pointer.distance >= 55 && performance.now() - lastStroke > 130) {
      pointer.distance = 0;
      lastStroke = performance.now();
      stir();
    }
  }
  function pointerEnd(event: PointerEvent) {
    if (pointer?.id === event.pointerId) pointer = undefined;
  }
  const bowl = k('#cooking-bowl');
  kitchen.addEventListener('click', kitchenClick);
  kitchen.addEventListener('close', closeKitchen);
  shop.addEventListener('click', shopClick);
  bowl.addEventListener('pointerdown', pointerDown);
  bowl.addEventListener('pointermove', pointerMove);
  bowl.addEventListener('pointerup', pointerEnd);
  bowl.addEventListener('pointercancel', pointerEnd);

  return {
    renderKitchen,
    renderShop,
    closeKitchen,
    destroy() {
      if (disposed) return;
      closeKitchen();
      disposed = true;
      kitchen.removeEventListener('click', kitchenClick);
      kitchen.removeEventListener('close', closeKitchen);
      shop.removeEventListener('click', shopClick);
      bowl.removeEventListener('pointerdown', pointerDown);
      bowl.removeEventListener('pointermove', pointerMove);
      bowl.removeEventListener('pointerup', pointerEnd);
      bowl.removeEventListener('pointercancel', pointerEnd);
    },
  };
}
