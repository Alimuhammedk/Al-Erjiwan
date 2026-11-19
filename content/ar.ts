// All Arabic site text lives here so it can be proofread and edited in one place.
export const ar = {
  siteName: "أصباغ الأرجوان",
  tagline: "أصباغ ومواد طلاء",

  // Links appear in the header only when `enabled` is true (turn on as each page is built).
  nav: [
    { key: "home", label: "الرئيسية", href: "/", enabled: true },
    { key: "shop", label: "المتجر", href: "/shop", enabled: false },
    { key: "colours", label: "منتقي الألوان", href: "/colours", enabled: false },
    { key: "gallery", label: "معرض الأعمال", href: "/gallery", enabled: false },
    { key: "about", label: "من نحن", href: "/about", enabled: false },
  ],

  home: {
    categoriesTitle: "تسوّق حسب الفئة",
    bestSellersTitle: "الأكثر مبيعًا",
    offersTitle: "العروض",
    projectsTitle: "من أعمالنا",
    emptyCategories: "ستظهر الفئات هنا قريبًا",
    emptyBestSellers: "ستظهر المنتجات الأكثر مبيعًا هنا قريبًا",
    emptyOffers: "لا توجد عروض حاليًا",
    emptyProjects: "ستظهر صور أعمالنا هنا قريبًا",
  },

  common: {
    addToCart: "أضف إلى السلة",
    outOfStock: "نفدت الكمية",
    whatsapp: "تواصل عبر واتساب",
    viewAll: "عرض الكل",
    menu: "القائمة",
    closeMenu: "إغلاق القائمة",
    cart: "السلة",
    slide: "الشريحة",
    contactUs: "تواصل معنا",
    address: "العنوان",
    phone: "الهاتف",
    instagram: "إنستغرام",
    rights: "جميع الحقوق محفوظة",
  },
} as const;
