// shortcut: contact details are constants, move to the settings table in phase 5 when admin settings exist.
export const storeInfo = {
  whatsappNumber: "009647838232417",
  phone: "009647838232417",
  phoneDisplay: "+964 783 823 2417",
  telHref: "tel:+9647838232417",
  instagramUrl: "https://instagram.com/alerjiwan_iq9",
  instagram: "@alerjiwan_iq9",
  address: "الكفل، بابل",
};

// wa.me wants digits only, with no leading 00 or +.
export function whatsappLink(message?: string): string {
  const digits = storeInfo.whatsappNumber.replace(/\D/g, "").replace(/^00/, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
