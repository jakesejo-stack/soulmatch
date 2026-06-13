const navRoutes = {
      1: '../home/',
      2: '../scheme2/',
      3: '../scheme3/',
      4: '../scheme4/',
      5: '../auth/'
    };

    document.querySelectorAll('.scheme-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const scheme = Number(btn.dataset.scheme);
        if (scheme === 4) return;
        window.location.href = navRoutes[scheme] || '../main/';
      });
    });

    const cursor = document.getElementById('customCursor');
    document.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });

    document.querySelectorAll('button, .previewCard').forEach((element) => {
      element.addEventListener('mouseenter', () => {
        cursor.style.width = '56px';
        cursor.style.height = '56px';
        cursor.style.borderWidth = '3px';
      });
      element.addEventListener('mouseleave', () => {
        cursor.style.width = '40px';
        cursor.style.height = '40px';
        cursor.style.borderWidth = '2px';
      });
    });
