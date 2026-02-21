// ============================================
// STORAGE MANAGEMENT
// ============================================

class HabitStorage {
  static STORAGE_KEY = 'habitTrackerData';

  static getHabits() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  static saveHabits(habits) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(habits));
  }

  static addHabit(habit) {
    const habits = this.getHabits();
    habits.push(habit);
    this.saveHabits(habits);
  }

  static updateHabit(id, updatedHabit) {
    const habits = this.getHabits();
    const index = habits.findIndex(h => h.id === id);
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updatedHabit };
      this.saveHabits(habits);
    }
  }

  static deleteHabit(id) {
    const habits = this.getHabits();
    const filtered = habits.filter(h => h.id !== id);
    this.saveHabits(filtered);
  }
}

// ============================================
// DATE UTILITIES
// ============================================

class DateUtils {
  static formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static isToday(date) {
    const today = this.formatDate(new Date());
    const compareDate = this.formatDate(new Date(date));
    return today === compareDate;
  }

  static isYesterday(date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.formatDate(yesterday);
    const compareDate = this.formatDate(new Date(date));
    return yesterdayStr === compareDate;
  }

  static daysBetween(date1, date2) {
    const d1 = new Date(this.formatDate(date1));
    const d2 = new Date(this.formatDate(date2));
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  static formatDisplayDate(date) {
    if (!date) return 'Never';
    const d = new Date(date);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  }
}

// ============================================
// STREAK LOGIC
// ============================================

class StreakManager {
  static updateStreak(habit) {
    const today = DateUtils.formatDate(new Date());

    // If already completed today, don't increment again
    if (habit.lastCompletedDate && DateUtils.isToday(habit.lastCompletedDate)) {
      return { streak: habit.streak, lastCompletedDate: habit.lastCompletedDate };
    }

    // If never completed before
    if (!habit.lastCompletedDate) {
      return { streak: 1, lastCompletedDate: today };
    }

    // If completed yesterday, increment streak
    if (DateUtils.isYesterday(habit.lastCompletedDate)) {
      return { streak: habit.streak + 1, lastCompletedDate: today };
    }

    // If completed today (already handled above)
    if (DateUtils.isToday(habit.lastCompletedDate)) {
      return { streak: habit.streak, lastCompletedDate: habit.lastCompletedDate };
    }

    // If missed a day, reset streak to 1
    return { streak: 1, lastCompletedDate: today };
  }

  static canCompleteToday(habit) {
    if (!habit.lastCompletedDate) return true;
    return !DateUtils.isToday(habit.lastCompletedDate);
  }
}

// ============================================
// NAVIGATION
// ============================================

const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');

function navigateTo(pageName) {
  // Update page visibility
  pages.forEach(page => page.classList.remove('active'));
  document.getElementById(`${pageName}-page`).classList.add('active');

  // Update nav links
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.page === pageName) {
      link.classList.add('active');
    }
  });

  // Close mobile menu
  navMenu.classList.remove('active');

  // Refresh content based on page
  if (pageName === 'home') {
    renderHabits();
  } else if (pageName === 'stats') {
    renderStats();
  }
}

// Make navigateTo globally available
window.navigateTo = navigateTo;

// Nav link click handlers
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

// Hamburger menu toggle
hamburger.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

// ============================================
// HOME PAGE - HABITS
// ============================================

function renderHabits() {
  const habits = HabitStorage.getHabits();
  const container = document.getElementById('habits-container');
  const emptyState = document.getElementById('empty-state');

  if (habits.length === 0) {
    container.innerHTML = '';
    emptyState.classList.add('show');
    return;
  }

  emptyState.classList.remove('show');

  container.innerHTML = habits.map(habit => {
    const canComplete = StreakManager.canCompleteToday(habit);
    const completedToday = !canComplete;

    return `
      <div class="habit-card" data-id="${habit.id}">
        <div class="habit-header">
          <div class="habit-info">
            <h3>${habit.name}</h3>
            <p class="habit-category">${habit.category} • ${habit.frequency}</p>
          </div>
          <div class="habit-streak">
            <div class="streak-number">${habit.streak}</div>
            <div class="streak-label">Days</div>
          </div>
        </div>
        <div class="habit-footer">
          <span class="last-completed">
            ${habit.lastCompletedDate ? 'Last: ' + DateUtils.formatDisplayDate(habit.lastCompletedDate) : 'Not started'}
          </span>
          <button
            class="btn-complete ${completedToday ? 'completed' : ''}"
            onclick="completeHabit(event, '${habit.id}')"
            ${!canComplete ? 'disabled' : ''}
          >
            ${completedToday ? '✓ Done Today' : 'Complete'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers to cards (excluding button clicks)
  container.querySelectorAll('.habit-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.btn-complete')) {
        openModal(card.dataset.id);
      }
    });
  });
}

function completeHabit(event, id) {
  event.stopPropagation();
  const habits = HabitStorage.getHabits();
  const habit = habits.find(h => h.id === id);

  if (!habit) return;

  const updated = StreakManager.updateStreak(habit);
  HabitStorage.updateHabit(id, updated);
  renderHabits();
}

// Make completeHabit globally available
window.completeHabit = completeHabit;

// ============================================
// ADD HABIT PAGE - FORM
// ============================================

const habitForm = document.getElementById('habit-form');
const habitNameInput = document.getElementById('habit-name');
const nameError = document.getElementById('name-error');
const successMessage = document.getElementById('success-message');

// Real-time validation
habitNameInput.addEventListener('input', () => {
  validateHabitName();
});

function validateHabitName() {
  const value = habitNameInput.value.trim();

  if (value.length === 0) {
    nameError.textContent = 'Habit name is required';
    habitNameInput.classList.add('error');
    return false;
  }

  if (value.length < 3) {
    nameError.textContent = 'Habit name must be at least 3 characters';
    habitNameInput.classList.add('error');
    return false;
  }

  nameError.textContent = '';
  habitNameInput.classList.remove('error');
  return true;
}

habitForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!validateHabitName()) {
    return;
  }

  const habit = {
    id: Date.now().toString(),
    name: document.getElementById('habit-name').value.trim(),
    category: document.getElementById('habit-category').value,
    frequency: document.getElementById('habit-frequency').value,
    streak: 0,
    lastCompletedDate: null,
    createdAt: new Date().toISOString()
  };

  HabitStorage.addHabit(habit);

  // Show success message
  successMessage.classList.add('show');
  setTimeout(() => {
    successMessage.classList.remove('show');
  }, 3000);

  // Reset form
  habitForm.reset();
  nameError.textContent = '';
  habitNameInput.classList.remove('error');
});

// ============================================
// MODAL
// ============================================

const modal = document.getElementById('habit-modal');
const modalClose = document.getElementById('modal-close');
const modalOverlay = modal.querySelector('.modal-overlay');
const deleteBtn = document.getElementById('delete-habit-btn');

let currentModalHabitId = null;

function openModal(habitId) {
  const habits = HabitStorage.getHabits();
  const habit = habits.find(h => h.id === habitId);

  if (!habit) return;

  currentModalHabitId = habitId;

  document.getElementById('modal-habit-name').textContent = habit.name;
  document.getElementById('modal-category').textContent = habit.category;
  document.getElementById('modal-streak').textContent = `${habit.streak} days`;
  document.getElementById('modal-frequency').textContent = habit.frequency;
  document.getElementById('modal-last-completed').textContent =
    DateUtils.formatDisplayDate(habit.lastCompletedDate);

  modal.classList.add('show');
}

function closeModal() {
  modal.classList.remove('show');
  currentModalHabitId = null;
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

deleteBtn.addEventListener('click', () => {
  if (currentModalHabitId) {
    if (confirm('Are you sure you want to delete this habit?')) {
      HabitStorage.deleteHabit(currentModalHabitId);
      closeModal();
      renderHabits();
    }
  }
});

// ============================================
// STATS PAGE
// ============================================

function renderStats() {
  const habits = HabitStorage.getHabits();

  // Calculate total habits
  document.getElementById('total-habits').textContent = habits.length;

  // Calculate longest streak
  const longestStreak = habits.length > 0
    ? Math.max(...habits.map(h => h.streak))
    : 0;
  document.getElementById('longest-streak').textContent = longestStreak;

  // Calculate completion rate
  const completedToday = habits.filter(h =>
    h.lastCompletedDate && DateUtils.isToday(h.lastCompletedDate)
  ).length;
  const completionRate = habits.length > 0
    ? Math.round((completedToday / habits.length) * 100)
    : 0;
  document.getElementById('completion-rate').textContent = `${completionRate}%`;

  // Render carousel
  renderCarousel(habits);
}

function renderCarousel(habits) {
  const track = document.getElementById('carousel-track');
  const dotsContainer = document.getElementById('carousel-dots');

  if (habits.length === 0) {
    track.innerHTML = `
      <div class="carousel-slide">
        <h3>No Data Yet</h3>
        <p style="text-align: center; color: var(--text-secondary); margin-top: 1rem;">
          Start tracking habits to see your progress!
        </p>
      </div>
    `;
    dotsContainer.innerHTML = '';
    return;
  }

  // Create slides with different stats views
  const slides = [
    {
      title: 'Weekly Summary',
      stats: [
        { label: 'Total Habits', value: habits.length },
        { label: 'Completed Today', value: habits.filter(h => h.lastCompletedDate && DateUtils.isToday(h.lastCompletedDate)).length },
        { label: 'Average Streak', value: Math.round(habits.reduce((sum, h) => sum + h.streak, 0) / habits.length) + ' days' },
        { label: 'Active Streaks', value: habits.filter(h => h.streak > 0).length }
      ]
    },
    {
      title: 'Top Performers',
      stats: habits
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 4)
        .map(h => ({ label: h.name, value: h.streak + ' days' }))
    },
    {
      title: 'Category Breakdown',
      stats: getCategoryStats(habits)
    }
  ];

  track.innerHTML = slides.map(slide => `
    <div class="carousel-slide">
      <h3>${slide.title}</h3>
      <div class="carousel-slide-content">
        ${slide.stats.map(stat => `
          <div class="slide-stat">
            <span class="slide-stat-label">${stat.label}</span>
            <span class="slide-stat-value">${stat.value}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Create dots
  dotsContainer.innerHTML = slides.map((_, index) => `
    <span class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
  `).join('');

  // Setup carousel controls
  setupCarousel(slides.length);
}

function getCategoryStats(habits) {
  const categories = {};
  habits.forEach(habit => {
    categories[habit.category] = (categories[habit.category] || 0) + 1;
  });

  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category, count]) => ({
      label: category,
      value: count + (count === 1 ? ' habit' : ' habits')
    }));
}

let currentSlide = 0;

function setupCarousel(totalSlides) {
  const track = document.getElementById('carousel-track');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const dots = document.querySelectorAll('.carousel-dot');

  function updateCarousel() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, index) => {
      dot.classList.toggle('active', index === currentSlide);
    });
  }

  prevBtn.onclick = () => {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateCarousel();
  };

  nextBtn.onclick = () => {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateCarousel();
  };

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      currentSlide = parseInt(dot.dataset.index);
      updateCarousel();
    });
  });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  renderHabits();
});
