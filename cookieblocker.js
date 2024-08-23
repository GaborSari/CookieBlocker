class CookieBlocker {
  serviceCheckboxSelector = ".in.service:checkbox";
  categoryCheckboxSelector = ".in.category:checkbox";
  storeCookie = { name: "company-cookie", expires: 364 };
  /*
  https://gdpr.eu/cookies/
  2024.07.20.
  Strictly necessary cookies — These cookies are essential for you to browse the website and use its features, such as accessing secure areas of the site. Cookies that allow web shops to hold your items in your cart while you are shopping online are an example of strictly necessary cookies. These cookies will generally be first-party session cookies. While it is not required to obtain consent for these cookies, what they do and why they are necessary should be explained to the user.
  Preferences cookies — Also known as “functionality cookies,” these cookies allow a website to remember choices you have made in the past, like what language you prefer, what region you would like weather reports for, or what your user name and password are so you can automatically log in.
  Statistics cookies — Also known as “performance cookies,” these cookies collect information about how you use a website, like which pages you visited and which links you clicked on. None of this information can be used to identify you. It is all aggregated and, therefore, anonymized. Their sole purpose is to improve website functions. This includes cookies from third-party analytics services as long as the cookies are for the exclusive use of the owner of the website visited.
  Marketing cookies — These cookies track your online activity to help advertisers deliver more relevant advertising or to limit how many times you see an ad. These cookies can share that information with other organizations or advertisers. These are persistent cookies and almost always of third-party provenance.
  */
  dataCategories = ["functional", "preferences", "statistics", "marketing"];

  dataCategoryAttr = "data-category";
  dataServiceAttr = "data-service";

  dataWaitForIdAttr = "data-wait-for-id";
  dataWaitIdAttr = "data-wait-id";

  acceptedDataCategories = new Set([]);

  dataServices = new Set(this.collectDataServices());
  acceptedDataServices = new Set([]);
  constructor(cookieBar, cookieBarMini, categoryPanels) {
    this.cookieBar = $(cookieBar);
    this.cookieBarMini = $(cookieBarMini);
    this.categoryPanels = $(categoryPanels);

    $(document).ready(() => {
      this.handleCheckboxChanges();

      if (this.cookieBar.length) {
        let storedCookieSettings = this.getStoredCookieSettings();
        if (!storedCookieSettings) {
          this.cookieBar.addClass("is-active");
        } else {
          this.tickCookieSettings(storedCookieSettings);
          this.acceptCookieSettings(storedCookieSettings);
          this.cookieBarMini.addClass("is-active");
        }

        $("#cookie-continue-all, #cookie-agree").on("click", () => {
          this.handleAgreeAllClick();
          this.hideCookieBar();
        });
        $("#cookie-save").on("click", () => {
          this.handleSaveClick();
          this.hideCookieBar();
        });
        $(this.cookieBarMini).on("click", () => {
          this.showCookieBar();
        });
      }

      $("#cookie-close-btn").on("click", () => {
        this.hideCookieBar();
      });
    });
  }

  acceptCategory(category) {
    console.log("Accepting category", category);

    const scripts = document.querySelectorAll(
      `script[type="text/plain"][${this.dataCategoryAttr}="${category}"]`
    );
    scripts.forEach((script) => {
      this.releaseScript(script);
    });

    this.acceptedDataCategories.add(category);
    const allCategoryAccepted = this.dataCategories.every((c) =>
      this.acceptedDataCategories.has(c)
    );
    console.log("allCategoryAccepted", allCategoryAccepted);
    if (allCategoryAccepted) {
      const scripts = document.querySelectorAll(
        `script[type="text/plain"][${this.dataCategoryAttr}="fallback-all"]`
      );
      scripts.forEach((script) => {
        this.releaseScript(script);
      });
    }
  }

  acceptService(service) {
    console.log("Accepting service", service);
    const scripts = document.querySelectorAll(
      `script[type="text/plain"][${this.dataServiceAttr}="${service}"]`
    );
    scripts.forEach((script) => {
      this.releaseScript(script);
    });
    this.acceptedDataServices.add(service);
  }

  releaseScript(script) {
    console.log("Releasing script", script);
    const waitForId = script.getAttribute(this.dataWaitForIdAttr);
    console.log("waitForId", waitForId);
    if (waitForId) {
      const p = document.querySelectorAll(
        `script[${this.dataWaitIdAttr}="${waitForId}"]`
      );
      if (!p.length) {
        console.log("No parent script for", script, "cannot be released");
        return;
      }
      if (p && p.type === "text/plain") {
        return;
      }
    }
    const newScript = document.createElement("script");
    newScript.type = "text/javascript";
    const waitId = script.getAttribute(this.dataWaitIdAttr);
    if (waitId) {
      newScript.onload = () => {
        const dependents = document.querySelectorAll(
          `script[${this.dataWaitForIdAttr}="${waitId}"]`
        );
        dependents.forEach((dependent) => {
          this.releaseScript(dependent);
        });
      };
    }

    // Copy all attributes from the old script to the new script
    Array.from(script.attributes).forEach((attr) => {
      if (attr.name !== "type") {
        newScript.setAttribute(attr.name, attr.value);
      }
    });

    // If the script has inner content, copy it
    if (script.innerHTML) {
      newScript.innerHTML = script.innerHTML;
    }

    // Replace the old script with the new one in the same position
    script.parentNode.replaceChild(newScript, script);
  }

  collectDataServices() {
    const dataServiceValues = [];
    const scripts = document.querySelectorAll("script");

    scripts.forEach((script) => {
      const dataService = script.getAttribute(this.dataServiceAttr);
      if (dataService) {
        dataServiceValues.push(dataService);
      }
    });

    return dataServiceValues;
  }

  showCookieBar() {
    this.cookieBar.addClass("is-active");
    this.cookieBarMini.removeClass("is-active");
  }

  hideCookieBar() {
    this.cookieBar.removeClass("is-active");
    this.cookieBarMini.addClass("is-active");
  }

  getStoredCookieSettings() {
    let settings = Cookies.get(this.storeCookie.name);
    return settings !== undefined ? JSON.parse(settings) : false;
  }

  handleCheckboxChanges() {
    this.categoryPanels.each((index, categoryPanel) => {
      $(categoryPanel)
        .find(this.serviceCheckboxSelector)
        .change((event) => {
          this.handleServiceChange(event.currentTarget, categoryPanel);
        });

      $(categoryPanel)
        .find(this.categoryCheckboxSelector)
        .change((event) => {
          this.handleCategoryChange(event.currentTarget, categoryPanel);
        });
    });
  }

  tickCookieSettings(cookieSettings) {
    if (!cookieSettings) return;

    Object.keys(cookieSettings).forEach((category) => {
      const categoryAccepted = cookieSettings[category].accepted;
      const categoryCheckbox = $(
        `${this.categoryCheckboxSelector}[${this.dataCategoryAttr}="${category}"]`,
        this.categoryPanels
      );

      if (categoryAccepted) {
        categoryCheckbox.prop("checked", true).trigger("change");
      }

      Object.keys(cookieSettings[category].services).forEach((service) => {
        const serviceAccepted = cookieSettings[category].services[service];
        const serviceCheckbox = $(
          `${this.serviceCheckboxSelector}[${this.dataServiceAttr}="${service}"]`,
          this.categoryPanels
        );

        if (serviceAccepted) {
          serviceCheckbox.prop("checked", true).trigger("change");
        }
      });
    });
  }

  acceptCookieSettings(cookieSettings) {
    if (!cookieSettings) return;

    Object.keys(cookieSettings).forEach((category) => {
      const categoryAccepted = cookieSettings[category].accepted;
      if (categoryAccepted) {
        this.acceptCategory(category);
      }
      Object.keys(cookieSettings[category].services).forEach((service) => {
        const serviceAccepted = cookieSettings[category].services[service];
        if (serviceAccepted) {
          this.acceptService(service);
        }
      });
    });
  }

  handleAgreeAllClick() {
    const categories = $(this.categoryCheckboxSelector, this.categoryPanels);

    categories.each((index, checkbox) => {
      $(checkbox).prop("checked", true).trigger("change");
    });

    const settings = this.getCookieSettings();
    this.acceptCookieSettings(settings);
    this.saveCookieSettings(settings);
  }

  handleSaveClick() {
    let servicesWithdraw = [];

    const settings = this.getCookieSettings();
    this.acceptCookieSettings(settings);
    const previousSettings = this.getStoredCookieSettings();
    for (let [categoryName, _] of Object.entries(previousSettings)) {
      const currentCategory = settings[categoryName];
      if (currentCategory) {
        for (let [serviceName, serviceAccepted] of Object.entries(
          previousSettings[categoryName].services
        )) {
          if (serviceAccepted && !currentCategory.services[serviceName]) {
            servicesWithdraw.push(serviceName);
          }
        }
      }
    }

    this.saveCookieSettings(settings);

    // Handle service withdrawal and reload page if needed
    if (servicesWithdraw.length > 0) {
      console.log("Service removed", servicesWithdraw);
      setTimeout(() => {
        location.reload();
      }, 500);
    }
  }

  handleCategoryChange(categoryCheckbox, categoryPanel) {
    const category = $(categoryPanel).attr(this.dataCategoryAttr);
    const accepted = $(categoryCheckbox).is(":checked");

    if (!category) return;

    $(".cookie-title", categoryPanel).toggleClass("colored", accepted);
    $(this.serviceCheckboxSelector, categoryPanel)
      .prop("checked", accepted)
      .trigger("change");
  }

  handleServiceChange(serviceCheckbox, categoryPanel) {
    const category = $(categoryPanel).attr(this.dataCategoryAttr);
    const accepted = $(serviceCheckbox).is(":checked");
    const services = $(this.serviceCheckboxSelector, categoryPanel);
    const categoryCheckbox = $(this.categoryCheckboxSelector, categoryPanel);

    if (!category) return;

    if (accepted) {
      if (
        $(".in.service:checkbox:checked", categoryPanel).length ===
        services.length
      ) {
        categoryCheckbox.prop("checked", true);
      }
    } else {
      categoryCheckbox.prop("checked", false);
    }
  }

  getCookieSettings() {
    const storedCookieSettings = {};
    this.categoryPanels.each((index, categoryPanel) => {
      const categoryName = $(categoryPanel).attr(this.dataCategoryAttr);
      const categoryAccepted = $(
        this.categoryCheckboxSelector,
        categoryPanel
      ).is(":checked");

      const servicesMap = $(this.serviceCheckboxSelector, categoryPanel)
        .toArray()
        .reduce((map, item) => {
          const serviceName = $(item).attr(this.dataServiceAttr);
          map[serviceName] = $(item).is(":checked");
          return map;
        }, {});

      // Update stored cookie settings
      storedCookieSettings[categoryName] = {
        accepted: categoryAccepted,
        services: servicesMap,
      };
    });
    return storedCookieSettings;
  }

  saveCookieSettings(settings) {
    // Save updated settings
    Cookies.set(this.storeCookie.name, JSON.stringify(settings), {
      expires: this.storeCookie.expires,
    });
  }
}
