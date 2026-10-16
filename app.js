const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const state = {
  categories: [],
  user: null,
  profile: null,
  activeMode: 'skilled',
  activeCategory: 'All',
  selectedWorker: null,
  pendingAction: null,
  activeDashboardTab: 'bookings',
  eventCursor: null,
  eventTimer: null,
  eventPollInFlight: false,
  toastTimer: null,
  currentTaskId: null,
  chatHistory: []
};

const dialogs = {
  booking: $('#booking-dialog'),
  task: $('#task-dialog'),
  auth: $('#auth-dialog'),
  apply: $('#apply-dialog'),
  dashboard: $('#dashboard-dialog')
};

const categoryPresentation = {
  Technology: { icon: '⌘', tone: 'blue', detail: 'Software · AI · Data · IT' },
  'Design & creative': { icon: '✦', tone: 'lilac', detail: 'UI/UX · Video · Writing' },
  Business: { icon: '↗', tone: 'sage', detail: 'Consulting · Marketing · Operations' },
  Professional: { icon: '◈', tone: 'sun', detail: 'Finance · Legal · Advisory' },
  'Skilled trades': { icon: '⚒', tone: 'peach', detail: 'Electrical · Plumbing · Carpentry' },
  'Home services': { icon: '⌂', tone: 'blue', detail: 'Repair · Maintenance · Installation' },
  'Artisan & craft': { icon: '✿', tone: 'rose', detail: 'Handmade · Textile · Woodwork' },
  Education: { icon: '⌑', tone: 'sun', detail: 'Tutoring · Training · Coaching' },
  Agriculture: { icon: '❋', tone: 'sage', detail: 'Farm services · Equipment · Support' },
  Events: { icon: '✧', tone: 'lilac', detail: 'Photography · Planning · Production' },
  Logistics: { icon: '⇢', tone: 'peach', detail: 'Delivery · Transport · Supply' },
  'Everyday guild tasks': { icon: '✳', tone: 'rose', detail: 'Short shifts · Local crews · Flexible work' }
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  let payload = {};
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.');
  return payload;
}

function showToast(message, duration = 3600) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('is-visible'), duration);
}

function showDialog(dialog) {
  if (!dialog.open) dialog.showModal();
  $('.dialog-backdrop').classList.add('is-visible');
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
  if (!Object.values(dialogs).some((item) => item.open)) $('.dialog-backdrop').classList.remove('is-visible');
}

function closeAllDialogs() {
  Object.values(dialogs).forEach((dialog) => { if (dialog.open) dialog.close(); });
  $('.dialog-backdrop').classList.remove('is-visible');
}

function formatMoney(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount) || 0);
}

function formatDate(value, includeTime = true) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Time to be agreed';
  return new Intl.DateTimeFormat('en-IN', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
}

function localDateTimeInput(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function defaultSchedule(choice = $('#search-when').value) {
  const date = new Date();
  if (choice === 'Tomorrow') date.setDate(date.getDate() + 1);
  else if (choice === 'This week') date.setDate(date.getDate() + 3);
  else if (choice === "I'm flexible") date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  if (date.getTime() < Date.now() + 60 * 60_000) date.setTime(Date.now() + 2 * 60 * 60_000);
  return localDateTimeInput(date);
}

function categoryOptions(select, selected = '') {
  select.innerHTML = state.categories
    .map((category) => `<option value="${escapeHtml(category.name)}" ${category.name === selected ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('');
}

function visibleCategories() {
  const categories = state.categories;
  if (state.activeMode === 'tasks') return categories.filter((category) => category.mode !== 'online');
  return categories.filter((category) => category.name !== 'Everyday guild tasks');
}

function renderCategories() {
  const categories = visibleCategories();
  if (state.activeCategory !== 'All' && !categories.some((category) => category.name === state.activeCategory)) state.activeCategory = 'All';
  $('#category-row').innerHTML = [
    `<button class="category-chip ${state.activeCategory === 'All' ? 'is-active' : ''}" type="button" data-category="All"><span class="category-icon">✧</span><span class="category-name">Everything</span></button>`,
    ...categories.map((category) => {
      const presentation = categoryPresentation[category.name] || { icon: '✦' };
      return `<button class="category-chip ${state.activeCategory === category.name ? 'is-active' : ''}" type="button" data-category="${escapeHtml(category.name)}"><span class="category-icon">${presentation.icon}</span><span class="category-name">${escapeHtml(category.name)}</span></button>`;
    })
  ].join('');
}

function categoryCard(category) {
  const display = categoryPresentation[category.name] || { icon: '✦', tone: 'sage', detail: '' };
  const modeLabel = { online: 'ONLINE', local: 'LOCAL', hybrid: 'ONLINE + LOCAL' }[category.mode] || 'ALL WORK';
  const workerCount = Number(category.workerCount) || 0;
  const countLabel = workerCount === 0 ? 'No member profiles yet' : `${workerCount} ${workerCount === 1 ? 'member profile' : 'member profiles'}`;
  return `<article class="service-card">
    <div class="card-visual visual-${escapeHtml(display.tone)}"><span class="card-badge">${escapeHtml(category.name.toUpperCase())}</span><span class="card-mode">${modeLabel}</span><span class="visual-icon" aria-hidden="true">${display.icon}</span></div>
    <div class="card-body"><div class="card-title-row"><h3 class="card-title">${escapeHtml(category.name)}</h3></div>
      <p class="card-detail">${escapeHtml(display.detail || category.detail || '')}</p>
      <div class="card-bottom"><span class="card-count"><svg class="icon"><use href="#icon-shield"/></svg>${countLabel}</span></div>
      <div class="card-bottom"><button type="button" class="card-book" data-open-category="${escapeHtml(category.name)}" data-category-mode="${escapeHtml(category.mode)}"><span class="card-cta">${workerCount ? 'Find your match' : 'Browse this category'} <svg class="icon"><use href="#icon-arrow"/></svg></span></button></div>
    </div>
  </article>`;
}

async function renderCatalog() {
  const grid = $('#service-grid');
  if (state.activeMode === 'tasks') {
    $('#listing-label').textContent = 'Open guild contracts';
    await loadGuildTasks();
    return;
  }
  $('#listing-label').textContent = state.activeCategory === 'All' ? 'Explore real profiles by category' : `Explore ${state.activeCategory}`;
  grid.innerHTML = '<div class="empty-results">Loading marketplace categories…</div>';
  const categories = visibleCategories().filter((category) => state.activeCategory === 'All' || category.name === state.activeCategory);
  grid.innerHTML = categories.slice(0, 6).map(categoryCard).join('') || '<div class="empty-results">No categories found. Choose another filter.</div>';
}

function setMode(mode) {
  state.activeMode = mode;
  state.activeCategory = 'All';
  $$('[data-service-mode]').forEach((tab) => {
    const selected = tab.dataset.serviceMode === mode;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  $('#service-panel').setAttribute('aria-labelledby', mode === 'skilled' ? 'tab-skilled' : 'tab-tasks');
  renderCategories();
  renderCatalog();
}

function currentLocation() {
  return $('#search-where').value.trim();
}

function getWorkerMode(categoryMode = '') {
  if (categoryMode === 'online' || categoryMode === 'local') return categoryMode;
  return '';
}

async function openWorkerMatches(query, category = '', mode = '') {
  const search = query.trim();
  const searchLocation = mode === 'online' ? 'Online' : currentLocation();
  state.selectedWorker = null;
  $('#match-service').textContent = category || search || 'All available professionals';
  $('#match-location').textContent = `${searchLocation || 'Any location'} · ${$('#search-when').value}`;
  $('#booking-details').value = search ? `I’m looking for help with ${search}.` : '';
  $('#booking-location').value = searchLocation || '';
  $('#booking-when').value = defaultSchedule();
  $('#match-count').textContent = '…';
  $('#match-list').innerHTML = '<div class="empty-results">Finding member profiles…</div>';
  setBookingSelection(null);
  showDialog(dialogs.booking);
  const params = new URLSearchParams();
  if (search) params.set('q', search);
  if (category) params.set('category', category);
  if (mode) params.set('mode', getWorkerMode(mode));
  if (searchLocation && mode !== 'online') params.set('location', searchLocation);
  try {
    const result = await api(`/api/workers${params.size ? `?${params}` : ''}`);
    $('#match-count').textContent = String(result.total).padStart(2, '0');
    renderWorkerMatches(result.workers);
  } catch (error) {
    $('#match-count').textContent = '0';
    $('#match-list').innerHTML = `<div class="empty-results">${escapeHtml(error.message)}</div>`;
  }
}

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}

function renderWorkerMatches(workers) {
  const matchList = $('#match-list');
  if (!workers.length) {
    matchList.innerHTML = `<div class="guild-empty"><strong>No member profiles match this search yet.</strong><p>Global Shreni is growing. You can create a worker profile, or post a task so interested people can apply.</p><button class="small-action" type="button" data-open-worker>Offer your skills</button></div>`;
    return;
  }
  matchList.innerHTML = workers.map((worker, index) => {
    const rating = worker.reviewCount ? `<span class="rating"><svg class="icon"><use href="#icon-star"/></svg>${Number(worker.rating).toFixed(1)} · ${worker.reviewCount} ${worker.reviewCount === 1 ? 'review' : 'reviews'}</span>` : '<span class="worker-rating-empty">New on Shreni</span>';
    const reasons = worker.reasons.length ? worker.reasons : ['Relevant member profile'];
    return `<button class="worker-card" type="button" aria-pressed="false" data-worker-id="${escapeHtml(worker.id)}" data-worker-mode="${escapeHtml(worker.mode)}">
      <span class="worker-avatar ${index % 3 === 1 ? 'tone-blue' : index % 3 === 2 ? 'tone-sage' : ''}">${escapeHtml(initials(worker.name))}</span>
      <span class="worker-info"><span class="worker-name-row"><span class="worker-name">${escapeHtml(worker.name)}</span><span class="worker-tag">${worker.fitScore >= 55 ? 'GOOD FIT' : 'PROFILE MATCH'}</span></span>
        <span class="worker-meta">${rating}<span>${escapeHtml(worker.location)}</span><span>${escapeHtml(worker.mode.toUpperCase())}</span></span>
        <span class="worker-match-note">${escapeHtml(worker.headline)}</span>
        <span class="worker-reasons">${reasons.map((reason) => `<span class="worker-reason">${escapeHtml(reason)}</span>`).join('')}</span>
        <span class="worker-match-note">${escapeHtml(worker.skills.join(' · ') || worker.category)}</span></span>
      <span class="worker-price"><strong>${worker.startingRate ? formatMoney(worker.startingRate) : 'Discuss'}</strong><span>starting rate</span></span>
      <span class="select-circle"><svg class="icon"><use href="#icon-check"/></svg></span>
    </button>`;
  }).join('');
}

function setBookingSelection(worker) {
  state.selectedWorker = worker;
  if (worker?.mode === 'online') $('#booking-location').value = 'Online / remote';
  else if (worker) $('#booking-location').value = currentLocation();
  $$('.worker-card', $('#match-list')).forEach((card) => {
    const selected = Boolean(worker && card.dataset.workerId === worker.id);
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
  $('#selection-text').textContent = worker ? `${worker.name} selected` : 'Select a profile to request a booking';
  $('.selection-copy').classList.toggle('has-selection', Boolean(worker));
  $('#request-button').disabled = !worker;
}

function openAuth(mode = 'login', preferredType = '') {
  setAuthMode(mode);
  if (preferredType) $('#account-type').value = preferredType;
  updateWorkerFields();
  showDialog(dialogs.auth);
}

function setAuthMode(mode) {
  const register = mode === 'register';
  $('#auth-form').dataset.mode = mode;
  $$('.auth-tab').forEach((tab) => {
    const selected = tab.dataset.authMode === mode;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  $$('.auth-register-only').forEach((field) => { field.hidden = !register; });
  const name = $('#auth-form [name="name"]');
  name.required = register;
  $('#auth-title').textContent = register ? 'Make your next connection.' : 'Welcome to Shreni.';
  $('#auth-subtitle').textContent = register ? 'Join as a customer, a worker, or both.' : 'Sign in to manage your work and requests.';
  $('#auth-submit').innerHTML = `${register ? 'Create my account' : 'Log in'} <svg class="icon"><use href="#icon-arrow"/></svg>`;
  $('#auth-password').setAttribute('autocomplete', register ? 'new-password' : 'current-password');
  $('#auth-password').minLength = register ? 10 : 1;
  $('#auth-password').parentElement.querySelector('small').textContent = register ? 'Use at least 10 characters.' : 'Passwords are case-sensitive.';
  updateWorkerFields();
}

function updateWorkerFields() {
  const active = $('#auth-form').dataset.mode === 'register' && ['worker', 'both'].includes($('#account-type').value);
  const fields = $('#worker-fields');
  fields.hidden = !active;
  $$('input, select, textarea', fields).forEach((field) => {
    if (['headline', 'bio', 'category', 'mode', 'location', 'startingRate', 'availability'].includes(field.name)) field.required = active;
  });
}

function setAccount(user, profile) {
  state.user = user || null;
  state.profile = profile || null;
  $('#account-button').hidden = Boolean(user);
  $('#dashboard-button').hidden = !user;
  if (user) $('#dashboard-button').textContent = user.name.split(' ')[0];
  connectRealtime();
}

function connectRealtime() {
  if (state.eventTimer) return;
  const notifyAndRefresh = (message) => {
    showToast(message);
    if (dialogs.dashboard.open) loadDashboard(state.activeDashboardTab);
    if (state.activeMode === 'tasks') loadGuildTasks();
  };
  const poll = async () => {
    if (document.visibilityState !== 'visible' || state.eventPollInFlight) return;
    state.eventPollInFlight = true;
    try {
      const endpoint = state.eventCursor === null ? '/api/events' : `/api/events?after=${state.eventCursor}`;
      const result = await api(endpoint);
      const { events } = result;
      if (state.eventCursor === null) state.eventCursor = Number(result.cursor) || 0;
      for (const event of events) {
        state.eventCursor = Math.max(state.eventCursor, event.id);
        const payload = event.payload;
        if (event.name === 'task.created') notifyAndRefresh(`New guild contract: ${payload.task.title}`);
        else if (event.name === 'task.application') notifyAndRefresh(`${payload.workerName} applied for “${payload.title}”.`);
        else if (event.name === 'task.selected') notifyAndRefresh(`A worker was selected for “${payload.title}”.`);
        else if (event.name === 'booking.created') notifyAndRefresh(`New booking request for ${payload.service}.`);
        else if (event.name === 'booking.updated') notifyAndRefresh(`Booking updated: ${payload.status}.`);
        else if (event.name === 'review.created') notifyAndRefresh('A new review was added to your profile.');
      }
    } catch {}
    finally { state.eventPollInFlight = false; }
  };
  poll();
  state.eventTimer = setInterval(poll, 10_000);
  document.addEventListener('visibilitychange', poll);
}

function taskCard(task, options = {}) {
  const start = formatDate(task.startsAt);
  return `<article class="service-card task-listing">
    <div class="card-visual visual-sage"><span class="card-badge">${escapeHtml(task.category)}</span><span class="card-mode">${task.durationHours} HOURS</span><span class="visual-icon" aria-hidden="true">✳</span></div>
    <div class="card-body"><div class="card-title-row"><h3 class="card-title">${escapeHtml(task.title)}</h3></div>
      <p class="task-card-description">${escapeHtml(task.description)}</p>
      <div class="task-card-meta"><span><svg class="icon"><use href="#icon-pin"/></svg>${escapeHtml(task.location)}</span><span><svg class="icon"><use href="#icon-clock"/></svg>${escapeHtml(start)}</span></div>
      <div class="card-task-actions"><span class="card-price">${formatMoney(task.payPerPerson)} <small>per person</small></span>
        ${options.owner ? `<button class="small-action" type="button" data-view-applicants="${escapeHtml(task.id)}">${Number(task.applicationCount) || 0} applicants · Review</button>` : `<button class="small-action" type="button" data-apply-task="${escapeHtml(task.id)}" ${task.applied ? 'disabled' : ''}>${task.applied ? 'Applied' : 'Apply'}</button>`}
      </div>
    </div>
  </article>`;
}

async function loadGuildTasks() {
  const grid = $('#service-grid');
  grid.innerHTML = '<div class="empty-results">Loading open guild contracts…</div>';
  const params = new URLSearchParams();
  const query = $('#search-need').value.trim();
  const location = currentLocation();
  if (query) params.set('q', query);
  if (location) params.set('location', location);
  if (state.activeCategory !== 'All') params.set('category', state.activeCategory);
  try {
    const result = await api(`/api/tasks${params.size ? `?${params}` : ''}`);
    if (!result.tasks.length) {
      grid.innerHTML = `<div class="guild-empty"><strong>No open contracts match this search yet.</strong><p>Check again soon, or post a short contract to bring local people and skills together.</p><button class="small-action" type="button" data-open-task>Post a guild task</button></div>`;
      return;
    }
    grid.innerHTML = result.tasks.slice(0, 9).map((task) => taskCard(task, { owner: task.isOwner })).join('');
  } catch (error) {
    grid.innerHTML = `<div class="guild-empty"><strong>We couldn’t load contracts.</strong><p>${escapeHtml(error.message)}</p></div>`;
  }
}

function captureTaskForm(form) {
  const values = new FormData(form);
  return {
    title: String(values.get('title') || '').trim(),
    description: String(values.get('description') || '').trim(),
    category: String(values.get('category') || ''),
    location: String(values.get('location') || '').trim(),
    startsAt: new Date(values.get('startsAt')).toISOString(),
    durationHours: Number(values.get('durationHours')),
    payPerPerson: Number(values.get('payPerPerson')),
    workersNeeded: Number(values.get('workersNeeded'))
  };
}

async function publishTask(task) {
  if (!state.user) {
    state.pendingAction = { type: 'publish-task', task };
    closeDialog(dialogs.task);
    openAuth('login');
    return;
  }
  const result = await api('/api/tasks', { method: 'POST', body: JSON.stringify(task) });
  closeDialog(dialogs.task);
  showToast(`“${result.task.title}” is live for workers to review.`);
  if (dialogs.dashboard.open) loadDashboard(state.activeDashboardTab);
  if (state.activeMode === 'tasks') loadGuildTasks();
}

function openApply(taskId, taskTitle) {
  state.currentTaskId = taskId;
  $('#apply-context').textContent = `Share why you’re a good fit for “${taskTitle}”. The employer will choose who to hire.`;
  $('#apply-form').reset();
  showDialog(dialogs.apply);
}

async function sendApplication(taskId, message) {
  if (!state.user) {
    state.pendingAction = { type: 'apply', taskId, message };
    closeDialog(dialogs.apply);
    openAuth('login');
    return;
  }
  await api(`/api/tasks/${encodeURIComponent(taskId)}/apply`, { method: 'POST', body: JSON.stringify({ message }) });
  closeDialog(dialogs.apply);
  showToast('Application sent. The employer can review your profile and note.');
  if (state.activeMode === 'tasks') loadGuildTasks();
  if (dialogs.dashboard.open) loadDashboard(state.activeDashboardTab);
}

async function createBooking(booking) {
  if (!state.user) {
    state.pendingAction = { type: 'booking', booking };
    closeDialog(dialogs.booking);
    openAuth('login');
    return;
  }
  const result = await api('/api/bookings', { method: 'POST', body: JSON.stringify(booking) });
  closeDialog(dialogs.booking);
  showToast(`Booking request sent to ${result.booking.workerName}.`);
  if (dialogs.dashboard.open) loadDashboard(state.activeDashboardTab);
}

function openTaskDialog() {
  $('#task-form').reset();
  $('#task-form [name="location"]').value = currentLocation();
  $('#task-form [name="startsAt"]').value = defaultSchedule();
  showDialog(dialogs.task);
}

function statusActions(booking) {
  if (booking.status === 'requested' && !booking.isCustomer) return `<button class="small-action" data-booking-status="accepted" data-booking-id="${escapeHtml(booking.id)}">Accept</button><button class="small-action" data-booking-status="declined" data-booking-id="${escapeHtml(booking.id)}">Decline</button>`;
  if (booking.status === 'requested' && booking.isCustomer) return `<button class="small-action" data-booking-status="cancelled" data-booking-id="${escapeHtml(booking.id)}">Cancel request</button>`;
  if (booking.status === 'accepted' && booking.isCustomer) return `<button class="small-action" data-booking-status="completed" data-booking-id="${escapeHtml(booking.id)}">Mark complete</button>`;
  return '';
}

function bookingDashboardCard(booking) {
  const otherPerson = booking.isCustomer ? booking.workerName : booking.customerName;
  const review = booking.status === 'completed' && booking.isCustomer && !booking.reviewRating
    ? `<form class="review-form" data-review-booking="${escapeHtml(booking.id)}"><div class="form-row"><label class="form-label">Your rating<select name="rating"><option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Okay</option><option value="2">2 · Poor</option><option value="1">1 · Bad</option></select></label><label class="form-label">Short review<input name="comment" maxlength="500" placeholder="What stood out?" required></label></div><div class="profile-actions"><button class="small-action" type="submit">Share review</button></div></form>`
    : booking.reviewRating ? `<p class="dashboard-card-meta">Your review: ${booking.reviewRating} / 5</p>` : '';
  return `<article class="dashboard-card"><div class="dashboard-card-head"><div><h4>${escapeHtml(booking.service)}</h4><p>${escapeHtml(otherPerson)} · ${escapeHtml(booking.location)}</p></div><span class="status-pill status-${escapeHtml(booking.status)}">${escapeHtml(booking.status)}</span></div>
    <div class="dashboard-card-meta"><span>${escapeHtml(formatDate(booking.scheduledAt))}</span><span>${formatMoney(booking.proposedPrice)} proposed</span><span>${escapeHtml(booking.isCustomer ? 'You hired' : 'You were hired')}</span></div>
    <p class="dashboard-card-meta">${escapeHtml(booking.details)}</p><div class="dashboard-card-actions">${statusActions(booking)}</div>${review}</article>`;
}

function profileForm(profile = {}) {
  const skills = Array.isArray(profile.skills) ? profile.skills.join(', ') : '';
  return `<form class="profile-form" id="profile-form">
    <div class="form-row"><label class="form-label">Display name<input name="name" value="${escapeHtml(state.user.name)}" maxlength="80" required></label><label class="form-label">Profile headline<input name="headline" value="${escapeHtml(profile.headline || '')}" maxlength="80" required placeholder="What kind of work do you do?"></label></div>
    <div class="form-row"><label class="form-label">Main category<select name="category" id="dashboard-profile-category" required></select></label><label class="form-label">Work type<select name="mode"><option value="local" ${profile.mode === 'local' ? 'selected' : ''}>Local, in person</option><option value="online" ${profile.mode === 'online' ? 'selected' : ''}>Online / remote</option><option value="hybrid" ${profile.mode === 'hybrid' ? 'selected' : ''}>Online and local</option></select></label></div>
    <div class="form-row"><label class="form-label">Your area / time zone<input name="location" value="${escapeHtml(profile.location || '')}" maxlength="100" required></label><label class="form-label">Starting rate (₹)<input name="startingRate" type="number" min="0" max="1000000" value="${Number(profile.starting_rate) || 0}" required></label></div>
    <label class="form-label">Skills, separated by commas<input name="skills" value="${escapeHtml(skills)}" maxlength="480" placeholder="e.g. repairs, installation"></label>
    <label class="form-label">About your work<textarea name="bio" rows="4" minlength="20" maxlength="700" required>${escapeHtml(profile.bio || '')}</textarea></label>
    <label class="form-label">Availability<select name="availability"><option ${profile.availability === 'Available today' ? 'selected' : ''}>Available today</option><option ${profile.availability === 'Available this week' ? 'selected' : ''}>Available this week</option><option ${profile.availability === 'Flexible schedule' ? 'selected' : ''}>Flexible schedule</option></select></label>
    <div class="profile-actions"><button class="button button-dark request-button" type="submit">Save my profile <svg class="icon"><use href="#icon-check"/></svg></button></div>
  </form>`;
}

function renderDashboard(tab, data, openTasks = []) {
  state.activeDashboardTab = tab;
  $$('.dashboard-tab').forEach((button) => {
    const selected = button.dataset.dashboardTab === tab;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-selected', String(selected));
  });
  $('#dashboard-welcome').textContent = `${data.user.name} · ${data.profile ? `${data.profile.headline} · ${data.profile.location}` : 'Customer account'}`;
  const content = $('#dashboard-content');
  if (tab === 'bookings') {
    content.innerHTML = `<h3 class="dashboard-section-title">Your service requests <small>${data.bookings.length} total</small></h3>${data.bookings.length ? `<div class="dashboard-stack">${data.bookings.map(bookingDashboardCard).join('')}</div>` : '<div class="dashboard-empty">Your bookings will show up here. Search the marketplace to request a professional, then manage responses here.</div>'}`;
    return;
  }
  if (tab === 'profile') {
    content.innerHTML = `<h3 class="dashboard-section-title">Your public work profile <small>Visible to people searching Shreni</small></h3>${profileForm(data.profile || {})}`;
    const profileCategory = $('#dashboard-profile-category');
    categoryOptions(profileCategory, data.profile?.category || state.categories[0]?.name || 'Technology');
    return;
  }
  const ownedHtml = data.ownedTasks.length
    ? `<div class="dashboard-stack">${data.ownedTasks.map((task) => `<article class="dashboard-card"><div class="dashboard-card-head"><div><h4>${escapeHtml(task.title)}</h4><p>${escapeHtml(task.location)} · ${escapeHtml(formatDate(task.startsAt))}</p></div><span class="status-pill status-${escapeHtml(task.status)}">${escapeHtml(task.status)}</span></div><div class="dashboard-card-meta"><span>${formatMoney(task.payPerPerson)} per person</span><span>${task.applicationCount} pending applications</span><span>${task.workersNeeded} worker${task.workersNeeded === 1 ? '' : 's'} needed</span></div><div class="dashboard-card-actions">${task.applicationCount ? `<button class="small-action" type="button" data-view-applicants="${escapeHtml(task.id)}">Review applicants</button>` : ''}</div><div class="applicant-list" id="applicants-${escapeHtml(task.id)}"></div></article>`).join('')}</div>`
    : '<div class="dashboard-empty">You haven’t posted a guild contract yet. Write a short brief, set the pay and hours, then choose from applicants.</div>';
  const applicationsHtml = data.applications.length
    ? `<div class="dashboard-stack">${data.applications.map((application) => `<article class="dashboard-card"><div class="dashboard-card-head"><div><h4>${escapeHtml(application.taskTitle)}</h4><p>${escapeHtml(application.location)} · ${escapeHtml(formatDate(application.startsAt))}</p></div><span class="status-pill status-${escapeHtml(application.status)}">${escapeHtml(application.status)}</span></div><div class="dashboard-card-meta"><span>${formatMoney(application.payPerPerson)} per person</span></div></article>`).join('')}</div>`
    : '<div class="dashboard-empty">Your applications to guild contracts will appear here.</div>';
  const openHtml = openTasks.filter((task) => !task.isOwner).length
    ? `<div class="service-grid dashboard-task-grid">${openTasks.filter((task) => !task.isOwner).slice(0, 6).map((task) => taskCard({ ...task, applied: data.applications.some((application) => application.taskId === task.id) })).join('')}</div>`
    : '<div class="dashboard-empty">No open contracts in your current area. Check back soon.</div>';
  content.innerHTML = `<h3 class="dashboard-section-title">Your posted contracts</h3>${ownedHtml}<h3 class="dashboard-section-title">Your applications <small>${data.applications.length}</small></h3>${applicationsHtml}<h3 class="dashboard-section-title">Find a guild shift</h3>${data.profile ? openHtml : '<div class="dashboard-empty">Create a worker profile before applying to guild tasks. <button class="small-action" type="button" data-dashboard-tab="profile">Set up my profile</button></div>'}`;
}

async function loadDashboard(tab = state.activeDashboardTab) {
  if (!state.user) return openAuth('login');
  state.activeDashboardTab = tab;
  const content = $('#dashboard-content');
  content.innerHTML = '<div class="dashboard-empty">Loading your Shreni workspace…</div>';
  showDialog(dialogs.dashboard);
  try {
    const [data, taskResult] = await Promise.all([api('/api/dashboard'), api('/api/tasks')]);
    state.user = data.user;
    state.profile = data.profile;
    renderDashboard(tab, data, taskResult.tasks);
  } catch (error) {
    content.innerHTML = `<div class="dashboard-empty">${escapeHtml(error.message)}</div>`;
  }
}

async function showTaskApplicants(taskId) {
  const container = $(`#applicants-${CSS.escape(taskId)}`);
  if (!container) return;
  container.innerHTML = '<span class="worker-rating-empty">Loading applications…</span>';
  try {
    const { applications } = await api(`/api/tasks/${encodeURIComponent(taskId)}/applications`);
    if (!applications.length) {
      container.innerHTML = '<span class="worker-rating-empty">No one has applied yet.</span>';
      return;
    }
    container.innerHTML = applications.map((application) => `<div class="applicant-row"><div><strong>${escapeHtml(application.name)} · ${escapeHtml(application.headline)}</strong><small>${escapeHtml(application.location)} · ${application.rating ? `${Number(application.rating).toFixed(1)} from ${application.reviewCount} reviews` : 'New on Shreni'} · ${escapeHtml(application.skills.join(', '))}</small><small>${escapeHtml(application.message)}</small></div>${application.status === 'pending' ? `<button class="small-action" type="button" data-select-application="${escapeHtml(application.id)}" data-select-task="${escapeHtml(taskId)}">Choose</button>` : `<span class="status-pill status-${escapeHtml(application.status)}">${escapeHtml(application.status)}</span>`}</div>`).join('');
  } catch (error) {
    container.innerHTML = `<span class="worker-rating-empty">${escapeHtml(error.message)}</span>`;
  }
}

async function completePendingAction() {
  const action = state.pendingAction;
  state.pendingAction = null;
  if (!action) return;
  try {
    if (action.type === 'booking') await createBooking(action.booking);
    else if (action.type === 'publish-task') await publishTask(action.task);
    else if (action.type === 'apply') await sendApplication(action.taskId, action.message);
  } catch (error) { showToast(error.message); }
}

async function registerOrLogin(form) {
  const values = new FormData(form);
  const registering = form.dataset.mode === 'register';
  const payload = {
    email: String(values.get('email') || '').trim(),
    password: String(values.get('password') || '')
  };
  if (registering) {
    payload.name = String(values.get('name') || '').trim();
    payload.accountType = String(values.get('accountType'));
    if (['worker', 'both'].includes(payload.accountType)) {
      payload.profile = {
        headline: String(values.get('headline') || '').trim(),
        category: String(values.get('category') || ''),
        mode: String(values.get('mode') || ''),
        location: String(values.get('location') || '').trim(),
        skills: String(values.get('skills') || ''),
        bio: String(values.get('bio') || '').trim(),
        startingRate: Number(values.get('startingRate')),
        availability: String(values.get('availability') || '')
      };
    }
  }
  const result = await api(registering ? '/api/auth/register' : '/api/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  setAccount(result.user, result.profile);
  closeDialog(dialogs.auth);
  form.reset();
  showToast(registering ? `Welcome, ${result.user.name}. Your account is ready.` : `Welcome back, ${result.user.name}.`);
  await completePendingAction();
}

async function finishGoogleSignIn(credential) {
  try {
    const payload = { credential };
    const form = $('#auth-form');
    if (form.dataset.mode === 'register') {
      const values = new FormData(form);
      payload.accountType = String(values.get('accountType') || 'customer');
      if (['worker', 'both'].includes(payload.accountType)) {
        payload.profile = {
          headline: String(values.get('headline') || '').trim(),
          category: String(values.get('category') || ''),
          mode: String(values.get('mode') || ''),
          location: String(values.get('location') || '').trim(),
          skills: String(values.get('skills') || ''),
          bio: String(values.get('bio') || '').trim(),
          startingRate: Number(values.get('startingRate')),
          availability: String(values.get('availability') || '')
        };
      }
    }
    const result = await api('/api/auth/google', { method: 'POST', body: JSON.stringify(payload) });
    setAccount(result.user, result.profile);
    closeDialog(dialogs.auth);
    showToast(`Welcome, ${result.user.name}.`);
    await completePendingAction();
  } catch (error) {
    showToast(error.message);
  }
}

async function initializeAuthProviders() {
  let config;
  try { config = await api('/api/config'); } catch { return; }
  if (!config.googleClientId) return;
  const googleContainer = $('#auth-google');
  googleContainer.hidden = false;
  try {
    if (!window.google?.accounts?.id) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
      });
    }
    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: (response) => finishGoogleSignIn(response.credential)
    });
    window.google.accounts.id.renderButton($('#google-sign-in-button'), {
      theme: 'outline',
      size: 'large',
      shape: 'rect',
      text: 'continue_with',
      width: 300
    });
  } catch {
    googleContainer.hidden = true;
  }
}

function appendChatMessage(role, text) {
  const message = document.createElement('div');
  message.className = `chat-message ${role}`;
  message.textContent = text;
  $('#chat-messages').append(message);
  $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
  return message;
}

async function sendChatMessage(event) {
  event.preventDefault();
  const input = $('#chat-input');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  appendChatMessage('user', message);
  const typing = appendChatMessage('assistant chat-typing', 'Shreni Guide is thinking…');
  const button = $('#chat-send');
  button.disabled = true;
  try {
    const result = await api('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history: state.chatHistory })
    });
    typing.remove();
    appendChatMessage('assistant', result.answer);
    state.chatHistory.push({ role: 'user', text: message }, { role: 'model', text: result.answer });
    state.chatHistory = state.chatHistory.slice(-10);
  } catch (error) {
    typing.remove();
    appendChatMessage('assistant chat-error', error.message);
  } finally {
    button.disabled = false;
    input.focus();
  }
}

async function updateProfile(form) {
  const values = new FormData(form);
  const payload = Object.fromEntries(values.entries());
  payload.startingRate = Number(payload.startingRate);
  const result = await api('/api/profile', { method: 'PUT', body: JSON.stringify(payload) });
  setAccount(result.user, result.profile);
  showToast('Your work profile is up to date.');
  loadDashboard('profile');
}

async function updateBookingStatus(bookingId, status) {
  await api(`/api/bookings/${encodeURIComponent(bookingId)}/status`, { method: 'POST', body: JSON.stringify({ status }) });
  showToast(status === 'accepted' ? 'Booking accepted.' : `Booking marked ${status}.`);
  loadDashboard('bookings');
}

async function submitReview(form) {
  const values = new FormData(form);
  await api(`/api/bookings/${encodeURIComponent(form.dataset.reviewBooking)}/review`, {
    method: 'POST', body: JSON.stringify({ rating: Number(values.get('rating')), comment: String(values.get('comment') || '').trim() })
  });
  showToast('Thank you. Your review is now part of this member’s work history.');
  loadDashboard('bookings');
}

async function chooseApplicant(taskId, applicationId) {
  await api(`/api/tasks/${encodeURIComponent(taskId)}/select`, { method: 'POST', body: JSON.stringify({ applicationId }) });
  showToast('Worker selected. The contract is updated in your dashboard.');
  loadDashboard('guild');
}

function setServiceMode(mode) {
  state.activeMode = mode;
  state.activeCategory = 'All';
  $$('[data-service-mode]').forEach((tab) => {
    const selected = tab.dataset.serviceMode === mode;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', String(selected));
  });
  $('#service-panel').setAttribute('aria-labelledby', mode === 'skilled' ? 'tab-skilled' : 'tab-tasks');
  renderCategories();
  renderCatalog();
}

function searchMarketplace(query) {
  const value = query.trim();
  if (state.activeMode === 'tasks') return loadGuildTasks();
  const category = state.categories.find((item) => item.name.toLowerCase() === value.toLowerCase());
  openWorkerMatches(value, category?.name || '', category?.mode || '');
}

async function initialise() {
  try {
    const [categoryResult, account] = await Promise.all([api('/api/categories'), api('/api/me')]);
    state.categories = categoryResult;
    categoryOptions($('#task-category'), 'Events');
    categoryOptions($('#profile-category'), 'Skilled trades');
    setAccount(account.user, account.profile);
    renderCategories();
    renderCatalog();
  } catch (error) {
    $('#service-grid').innerHTML = `<div class="guild-empty"><strong>Start the marketplace server to continue.</strong><p>${escapeHtml(error.message)} Run the project using its “start” command, then refresh this page.</p></div>`;
  }
}

$('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  searchMarketplace($('#search-need').value);
});

$$('[data-quick-search]').forEach((button) => button.addEventListener('click', () => {
  $('#search-need').value = button.dataset.quickSearch;
  searchMarketplace(button.dataset.quickSearch);
}));

$$('[data-service-mode]').forEach((tab) => tab.addEventListener('click', () => setServiceMode(tab.dataset.serviceMode)));

$('#category-row').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.activeCategory = button.dataset.category;
  renderCategories();
  renderCatalog();
});

$('#service-grid').addEventListener('click', (event) => {
  const categoryButton = event.target.closest('[data-open-category]');
  if (categoryButton) {
    const category = categoryButton.dataset.openCategory;
    $('#search-need').value = category;
    openWorkerMatches(category, category, categoryButton.dataset.categoryMode);
    return;
  }
  const taskButton = event.target.closest('[data-apply-task]');
  if (taskButton) {
    const task = taskButton.closest('.service-card');
    openApply(taskButton.dataset.applyTask, $('h3', task).textContent);
  }
  const applicantsButton = event.target.closest('[data-view-applicants]');
  if (applicantsButton) {
    loadDashboard('guild').then(() => showTaskApplicants(applicantsButton.dataset.viewApplicants));
  }
  if (event.target.closest('[data-open-task]')) openTaskDialog();
  if (event.target.closest('[data-open-worker]')) openAuth('register', 'worker');
});

$('#match-list').addEventListener('click', (event) => {
  if (event.target.closest('[data-open-worker]')) {
    closeDialog(dialogs.booking);
    openAuth('register', 'worker');
    return;
  }
  const workerCard = event.target.closest('[data-worker-id]');
  if (!workerCard) return;
  const selected = workerCard.getAttribute('aria-pressed') === 'true';
  if (selected) return setBookingSelection(null);
  const name = $('.worker-name', workerCard).textContent;
  const id = workerCard.dataset.workerId;
  const mode = workerCard.dataset.workerMode;
  const priceText = $('.worker-price strong', workerCard).textContent;
  const price = Number(priceText.replace(/[^\d]/g, '')) || 0;
  setBookingSelection({ id, name, mode, startingRate: price });
});

$('#booking-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.selectedWorker) return showToast('Choose a worker profile to continue.');
  const values = new FormData(event.currentTarget);
  const booking = {
    workerId: state.selectedWorker.id,
    service: $('#match-service').textContent,
    details: String(values.get('details') || '').trim(),
    location: String(values.get('location') || '').trim(),
    scheduledAt: new Date(values.get('scheduledAt')).toISOString(),
    proposedPrice: state.selectedWorker.startingRate
  };
  try { await createBooking(booking); } catch (error) { showToast(error.message); }
});

$$('[data-open-task]').forEach((button) => button.addEventListener('click', openTaskDialog));
$$('[data-open-worker]').forEach((button) => button.addEventListener('click', () => openAuth('register', 'worker')));
$('#account-button').addEventListener('click', () => openAuth('login'));
$('#dashboard-button').addEventListener('click', () => loadDashboard('bookings'));

$('#task-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await publishTask(captureTaskForm(event.currentTarget)); } catch (error) { showToast(error.message); }
});

$('#apply-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try { await sendApplication(state.currentTaskId, String(new FormData(event.currentTarget).get('message') || '').trim()); }
  catch (error) { showToast(error.message); }
});

$('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#auth-submit');
  button.disabled = true;
  try { await registerOrLogin(event.currentTarget); }
  catch (error) { showToast(error.message); }
  finally { button.disabled = false; }
});

$('#chat-launcher').addEventListener('click', () => {
  const panel = $('#chat-panel');
  panel.hidden = false;
  $('#chat-launcher').setAttribute('aria-expanded', 'true');
  $('#chat-input').focus();
});
$('#chat-close').addEventListener('click', () => {
  $('#chat-panel').hidden = true;
  $('#chat-launcher').setAttribute('aria-expanded', 'false');
});
$('#chat-form').addEventListener('submit', sendChatMessage);

$$('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
$('#account-type').addEventListener('change', updateWorkerFields);

$('#dashboard-content').addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-dashboard-tab]');
  if (tab) return loadDashboard(tab.dataset.dashboardTab);
  const action = event.target.closest('[data-booking-status]');
  if (action) {
    try { await updateBookingStatus(action.dataset.bookingId, action.dataset.bookingStatus); }
    catch (error) { showToast(error.message); }
    return;
  }
  const applicants = event.target.closest('[data-view-applicants]');
  if (applicants) return showTaskApplicants(applicants.dataset.viewApplicants);
  const selectButton = event.target.closest('[data-select-application]');
  if (selectButton) {
    try { await chooseApplicant(selectButton.dataset.selectTask, selectButton.dataset.selectApplication); }
    catch (error) { showToast(error.message); }
  }
  if (event.target.closest('[data-apply-task]')) {
    const button = event.target.closest('[data-apply-task]');
    const title = button.closest('.service-card')?.querySelector('h3')?.textContent || 'this guild task';
    openApply(button.dataset.applyTask, title);
  }
  if (event.target.closest('[data-open-task]')) openTaskDialog();
  if (event.target.closest('[data-open-worker]')) loadDashboard('profile');
});

$('#dashboard-content').addEventListener('submit', async (event) => {
  if (event.target.id === 'profile-form') {
    event.preventDefault();
    try { await updateProfile(event.target); } catch (error) { showToast(error.message); }
    return;
  }
  if (event.target.matches('[data-review-booking]')) {
    event.preventDefault();
    try { await submitReview(event.target); } catch (error) { showToast(error.message); }
  }
});

$('#logout-button').addEventListener('click', async () => {
  try {
    await api('/api/auth/logout', { method: 'POST', body: '{}' });
    setAccount(null, null);
    closeDialog(dialogs.dashboard);
    showToast('You’re signed out. See you soon.');
  } catch (error) { showToast(error.message); }
});

$$('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
Object.values(dialogs).forEach((dialog) => {
  dialog.addEventListener('close', () => {
    if (dialog === dialogs.auth && !state.user) state.pendingAction = null;
    if (!Object.values(dialogs).some((item) => item.open)) $('.dialog-backdrop').classList.remove('is-visible');
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

$$('.main-nav a').forEach((link) => link.addEventListener('click', () => {
  $('.menu-toggle').setAttribute('aria-expanded', 'false');
  $('.main-nav').classList.remove('is-open');
}));

$('.menu-toggle').addEventListener('click', (event) => {
  const toggle = event.currentTarget;
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  $('.main-nav').classList.toggle('is-open', !open);
});

initializeAuthProviders();
initialise();
