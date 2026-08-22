// Guards the contact form: it must actually POST to send-contact (not just
// open a mailto: link, which can't be confirmed as sent) and must show a
// clear confirmation once it succeeds.
const { makeDom, wait } = require("./helpers");

async function run() {
  const failures = [];
  let calledSendContact = false;

  const dom = makeDom("contact.html", {
    fetchImpl: async (url) => {
      if (typeof url === "string" && url.includes("send-contact")) {
        calledSendContact = true;
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    },
  });
  await wait(200);
  const doc = dom.window.document;

  const setVal = (id, val) => { const el = doc.getElementById(id); if (el) el.value = val; };
  setVal("c-name", "Test User");
  setVal("c-email", "test@example.com");
  setVal("c-msg", "Test message");

  const form = doc.getElementById("contact-form");
  if (!form) {
    failures.push("contact.html: #contact-form is missing");
  } else {
    form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
    await wait(300);

    if (!calledSendContact) {
      failures.push("contact.html: submitting the form did not call /.netlify/functions/send-contact - still using the old mailto: link approach with no send confirmation");
    }

    const readout = doc.getElementById("contact-readout");
    if (!readout || !/sent/i.test(readout.textContent)) {
      failures.push("contact.html: no confirmation shown in #contact-readout after a successful send");
    }
  }

  dom.window.close();
  return failures;
}

module.exports = { name: "contact-confirmation", run };
