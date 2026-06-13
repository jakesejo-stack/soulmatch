(async function () {
  try {
    const res = await fetch('/api/me', { cache: 'no-store' });
    const data = await res.json();
    if (data.user) {
      document.querySelectorAll('.lets-go').forEach((a) => {
        a.href = '../member-onboarding/';
        a.textContent = 'Open My SoulMatch';
      });
    }
  } catch (err) {}
})();
