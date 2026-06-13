'use strict';

    const CITY_ANIM_SPEED = 750;

    function getViewportSize() {
      return {
        width: Math.max(320, window.innerWidth || document.documentElement.clientWidth || 320),
        height: Math.max(480, window.innerHeight || document.documentElement.clientHeight || 480)
      };
    }

    class CitySlider {
      constructor() {
        this.slider = document.getElementById('citySlider');
        this.nav = document.getElementById('cityNav');
        this.cities = [
          { name: 'Burgas', image: 'https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=1800&q=85' },
          { name: 'Sofia', image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1800&q=85' },
          { name: 'Varna', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=85' },
          { name: 'Stara Zagora', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85' }
        ];
        this.curSlide = 1;
        this.animation = false;
        this.diff = 0;
        this.startX = 0;
        this.dragging = false;
        this.distOfLetGo = getViewportSize().width * 0.2;
        this.generateSlides();
        this.bind();
        this.updateBullets(1);
      }

      splitCity(name) {
        if (name.includes(' ')) return name.split(/\s+/);
        return [name];
      }

      generateSlides() {
        this.cities.forEach((city, index) => {
          const num = index + 1;
          const chunks = this.splitCity(city.name);
          const firstLetter = city.name.trim().charAt(0).toUpperCase();

          const slide = document.createElement('div');
          slide.className = `city-slide city-slide--${num}`;
          slide.dataset.target = String(num);

          const darkBg = document.createElement('div');
          darkBg.className = `city-slide__darkbg city-slide--${num}__darkbg`;
          darkBg.style.left = `${-50 * index}%`;
          darkBg.style.backgroundImage = `url('${city.image}')`;

          const wrapper = document.createElement('div');
          wrapper.className = `city-slide__text-wrapper city-slide--${num}__text-wrapper`;

          const letter = document.createElement('div');
          letter.className = `city-slide__letter city-slide--${num}__letter`;
          letter.textContent = firstLetter;
          letter.style.backgroundImage = `url('${city.image}')`;

          wrapper.appendChild(letter);
          chunks.forEach((chunk, chunkIndex) => {
            const text = document.createElement('div');
            text.className = `city-slide__text city-slide__text--${chunkIndex + 1}`;
            text.textContent = chunk;
            wrapper.appendChild(text);
          });

          slide.appendChild(darkBg);
          slide.appendChild(wrapper);
          this.slider.appendChild(slide);

          const navSlide = document.createElement('li');
          navSlide.className = `city-nav__slide city-nav__slide--${num}`;
          navSlide.dataset.target = String(num);
          this.nav.appendChild(navSlide);
        });
      }

      updateBullets(target) {
        this.nav.querySelectorAll('.city-nav__slide').forEach((item) => item.classList.remove('nav-active'));
        this.nav.querySelector(`.city-nav__slide--${target}`)?.classList.add('nav-active');
      }

      timeout() {
        this.animation = false;
      }

      pagination(direction) {
        this.animation = true;
        this.diff = 0;
        this.slider.classList.add('animation');
        this.slider.style.transform = `translate3d(-${((this.curSlide - direction) * 100)}%, 0, 0)`;
        this.slider.querySelectorAll('.city-slide__darkbg').forEach((el) => {
          el.style.transform = `translate3d(${((this.curSlide - direction) * 50)}%, 0, 0)`;
        });
        this.slider.querySelectorAll('.city-slide__letter, .city-slide__text').forEach((el) => {
          el.style.transform = 'translate3d(0, 0, 0)';
        });
      }

      navigateRight() {
        if (this.animation || this.curSlide >= this.cities.length) return;
        this.pagination(0);
        window.setTimeout(() => this.timeout(), CITY_ANIM_SPEED);
        this.updateBullets(this.curSlide + 1);
        this.curSlide++;
      }

      navigateLeft() {
        if (this.animation || this.curSlide <= 1) return;
        this.pagination(2);
        window.setTimeout(() => this.timeout(), CITY_ANIM_SPEED);
        this.updateBullets(this.curSlide - 1);
        this.curSlide--;
      }

      toDefault() {
        this.pagination(1);
        window.setTimeout(() => this.timeout(), CITY_ANIM_SPEED);
      }

      goTo(target) {
        if (this.animation || target === this.curSlide) return;
        this.updateBullets(target);
        this.curSlide = target;
        this.pagination(1);
        window.setTimeout(() => this.timeout(), CITY_ANIM_SPEED);
      }

      getPageX(event) {
        if (event.touches && event.touches[0]) return event.touches[0].pageX;
        if (event.changedTouches && event.changedTouches[0]) return event.changedTouches[0].pageX;
        return event.pageX;
      }

      onStart(event) {
        if (this.animation) return;
        const slide = event.target.closest('.city-slide');
        if (!slide) return;
        this.dragging = true;
        this.startX = this.getPageX(event);
        this.slider.classList.remove('animation');
      }

      onMove(event) {
        if (!this.dragging) return;
        const x = this.getPageX(event);
        this.diff = this.startX - x;
        if ((this.curSlide === 1 && this.diff < 0) || (this.curSlide === this.cities.length && this.diff > 0)) return;

        this.slider.style.transform = `translate3d(-${((this.curSlide - 1) * 100 + (this.diff / 30))}%, 0, 0)`;
        this.slider.querySelectorAll('.city-slide__darkbg').forEach((el) => {
          el.style.transform = `translate3d(${((this.curSlide - 1) * 50 + (this.diff / 60))}%, 0, 0)`;
        });
        this.slider.querySelectorAll('.city-slide__letter').forEach((el) => {
          el.style.transform = `translate3d(${this.diff / 60}vw, 0, 0)`;
        });
        this.slider.querySelectorAll('.city-slide__text').forEach((el) => {
          el.style.transform = `translate3d(${this.diff / 15}px, 0, 0)`;
        });
      }

      onEnd() {
        if (!this.dragging || this.animation) return;
        this.dragging = false;
        if (this.diff >= this.distOfLetGo) this.navigateRight();
        else if (this.diff <= -this.distOfLetGo) this.navigateLeft();
        else this.toDefault();
      }

      bind() {
        window.addEventListener('resize', () => {
          this.distOfLetGo = getViewportSize().width * 0.2;
        });

        document.addEventListener('mousedown', (event) => this.onStart(event));
        document.addEventListener('touchstart', (event) => this.onStart(event), { passive: true });
        document.addEventListener('mousemove', (event) => this.onMove(event));
        document.addEventListener('touchmove', (event) => this.onMove(event), { passive: true });
        document.addEventListener('mouseup', () => this.onEnd());
        document.addEventListener('touchend', () => this.onEnd());

        this.nav.addEventListener('click', (event) => {
          const item = event.target.closest('.city-nav__slide');
          if (!item) return;
          this.goTo(Number(item.dataset.target));
        });

        document.querySelectorAll('.city-side-nav').forEach((nav) => {
          nav.addEventListener('click', () => {
            if (nav.dataset.target === 'right') this.navigateRight();
            if (nav.dataset.target === 'left') this.navigateLeft();
          });
        });

        document.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowRight') this.navigateRight();
          if (event.key === 'ArrowLeft') this.navigateLeft();
        });

        document.addEventListener('wheel', (event) => {
          if (this.animation) return;
          if (event.deltaY < 0) this.navigateLeft();
          if (event.deltaY > 0) this.navigateRight();
        }, { passive: true });
      }
    }

    new CitySlider();

    const navRoutes = {
      1: '../home/',
      2: '../scheme2/',
      3: '../scheme3/',
      4: '../scheme4/',
      5: '../auth/'
    };

    document.querySelectorAll('.color-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const scheme = Number(btn.dataset.scheme);
        if (scheme === 2) return;
        window.location.href = navRoutes[scheme] || '../main/';
      });
    });

    const cursor = document.getElementById('customCursor');
    document.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      cursor.style.borderWidth = '2.5px';
    });

    document.querySelectorAll('button, .city-nav__slide, .city-side-nav').forEach((element) => {
      element.addEventListener('mouseenter', () => {
        cursor.style.width = '54px';
        cursor.style.height = '54px';
        cursor.style.borderWidth = '3px';
      });
      element.addEventListener('mouseleave', () => {
        cursor.style.width = '40px';
        cursor.style.height = '40px';
        cursor.style.borderWidth = '2px';
      });
    });
