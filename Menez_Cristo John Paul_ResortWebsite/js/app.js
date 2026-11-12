
var EXT = ["jpg", "jpeg", "png", "webp", "jfif", "svg"];
function nextExt(t) {
  var m = (t.getAttribute("src") || "").match(/^(.*)\.(jpg|jpeg|png|webp|jfif)$/); if (!m) return;
  t.src = m[1] + "." + EXT[EXT.indexOf(m[2].toLowerCase()) + 1];
}
document.addEventListener("error", function (e) { if (e.target.tagName === "IMG") nextExt(e.target); }, true);
// images that already failed before this script ran (the static ones in the HTML)
Array.prototype.forEach.call(document.images, function (i) { if (i.complete && i.naturalWidth === 0) nextExt(i); });
$(function () {
  // ---------- data ----------
  var ROOMS = [
    {id: 1, name: "Garden Studio", price: 3800, cap: 2, beds: "1 queen bed", size: "28 sqm", view: "Garden view", units: 6, img: "images/room-1.jpg"},
    {id: 2, name: "Ocean View Deluxe", price: 5600, cap: 3, beds: "1 king bed + sofa bed", size: "36 sqm", view: "Ocean view", units: 4, img: "images/room-2.jpg"},
    {id: 3, name: "Family Suite", price: 7800, cap: 5, beds: "2 queen beds + bunk", size: "58 sqm", view: "Pool view", units: 3, img: "images/room-3.jpg"},
    {id: 4, name: "Beachfront Villa", price: 12500, cap: 6, beds: "2 king beds + daybed", size: "92 sqm", view: "Beachfront", units: 2, img: "images/room-4.jpg"}
  ];
  var TAX = 0.22; // 12% VAT + 10% service charge
  var SEED = [ // demo bookings so availability is visible
    {room: 4, ci: "2026-12-20", co: "2026-12-27"}, {room: 4, ci: "2026-12-22", co: "2026-12-30"},
    {room: 3, ci: "2026-12-24", co: "2026-12-28"}, {room: 3, ci: "2026-12-24", co: "2026-12-29"}, {room: 3, ci: "2026-12-25", co: "2026-12-27"}
  ];
  function php(n) { return "PHP " + Math.round(n).toLocaleString("en-PH"); }
  function nights(a, b) { return a && b ? Math.round((new Date(b) - new Date(a)) / 864e5) : 0; }
  function stored() { try { return JSON.parse(localStorage.getItem("azul_bookings") || "[]"); } catch (e) { return []; } }
  function left(r, a, b) {
    var used = SEED.concat(stored()).filter(function (x) { return x.room === r.id && x.ci < b && x.co > a; }).length;
    return r.units - used;
  }
  function fmt(d) { return d ? d.split("-").reverse().join("/") : "--/--/----"; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  var today = iso(new Date());
  function validDates(a, b) {
    if (!a || !b) return "Choose your check-in and check-out dates.";
    if (a < today) return "Check-in can’t be in the past.";
    if (nights(a, b) < 1) return "Check-out must be at least one night after check-in.";
    return "";
  }
  function bind(ci, co) { // keeps date pickers consistent
    $(ci).attr("min", today);
    $(ci).on("change", function () {
      var n = new Date(this.value); n.setDate(n.getDate() + 1);
      if (this.value) { $(co).attr("min", iso(n)); if ($(co).val() <= this.value) $(co).val(""); }
    });
  }
  var q = new URLSearchParams(location.search);

  // ---------- shared: nav, newsletter ----------
  $(".burger").on("click", function () { var o = $(".nav").toggleClass("open").hasClass("open"); $(this).attr("aria-expanded", o); });
  $("#news").on("submit", function (e) { e.preventDefault(); $("#newsMsg").text("Thanks! You’re subscribed."); this.reset(); });
  $(".x").on("click", function () { $(this).closest(".modal,.lightbox").prop("hidden", true); });
  $(document).on("keydown", function (e) { if (e.key === "Escape") $(".modal,.lightbox").prop("hidden", true); });

  var page = $("body").data("page");

  // ---------- home: availability bar ----------
  if (page === "index") {
    bind("#ci", "#co");
    $("#availBar").on("submit", function (e) {
      e.preventDefault();
      var err = validDates($("#ci").val(), $("#co").val());
      if (err) return $("#availMsg").text(err);
      location.href = "rooms.html?ci=" + $("#ci").val() + "&co=" + $("#co").val() + "&g=" + $("#gu").val();
    });
  }

  // ---------- rooms ----------
  if (page === "rooms") {
    ROOMS.forEach(function (r) { $("#fType").append($("<option>").val(r.id).text(r.name)); });
    $("#ci").val(q.get("ci") || ""); $("#co").val(q.get("co") || ""); $("#fGuests").val(q.get("g") || "");
    bind("#ci", "#co");
    function render() {
      var a = $("#ci").val(), b = $("#co").val(), g = +$("#fGuests").val() || 0, t = +$("#fType").val() || 0, p = $("#fPrice").val();
      var datesOk = a && b && !validDates(a, b), n = nights(a, b);
      $("#stayNote").text(datesOk ? n + " night" + (n > 1 ? "s" : "") + ", " + fmt(a) + " to " + fmt(b) : "Pick dates to see live availability and your stay total.");
      var list = ROOMS.filter(function (r) {
        return (!t || r.id === t) && (!g || r.cap >= g) &&
          (!p || (p === "99999" ? r.price > 8000 : r.price <= +p));
      });
      var s = $("#fSort").val();
      list.sort(function (x, y) { return s === "p-desc" ? y.price - x.price : s === "cap" ? y.cap - x.cap : x.price - y.price; });
      var h = list.map(function (r) {
        var u = datesOk ? left(r, a, b) : null;
        var tag = u === null ? "" : u > 0 ? '<span class="tag">' + u + " left for your dates</span>" : '<span class="tag no">Not available for your dates</span>';
        var total = datesOk ? "<small>" + php(r.price * n * (1 + TAX)) + " total incl. taxes</small>" : "";
        var qs = "?room=" + r.id + (datesOk ? "&ci=" + a + "&co=" + b : "") + (g ? "&g=" + g : "");
        return '<article class="room"><img src="' + r.img + '" alt="' + r.name + '"><div class="in"><h3>' + r.name + "</h3>" +
          '<ul class="specs"><li>' + r.beds + "</li><li>Sleeps " + r.cap + "</li><li>" + r.size + "</li><li>" + r.view + "</li></ul><p>" + tag + "</p></div>" +
          '<div class="pr"><b>' + php(r.price) + "</b><small>per night</small>" + total +
          '<a class="btn big' + (u === 0 ? '" aria-disabled="true" tabindex="-1" style="opacity:.4;pointer-events:none' : "") + '" href="booking.html' + qs + '">Book now</a>' +
          '<a class="btn ghost" href="#" data-d="' + r.id + '">View details</a></div></article>';
      }).join("");
      $("#roomList").html(h || "<p>No rooms match those filters. Try widening your guests or price range.</p>");
    }
    $(".filters").on("change", "select,input", render);
    $("#roomList").on("click", "[data-d]", function (e) {
      e.preventDefault(); var r = ROOMS[$(this).data("d") - 1];
      alert(r.name + "\n" + r.beds + " · Sleeps " + r.cap + " · " + r.size + " · " + r.view + "\nFrom " + php(r.price) + " per night");
    });
    render();
  }

  // ---------- amenities ----------
  if (page === "amenities") {
    $(".amen a").on("click", function (e) {
      e.preventDefault(); var $a = $(this).closest("article");
      $("#amImg").attr("src", "images/" + $(this).data("modal") + ".jpg");
      $("#amT").text($a.find("h3").text()); $("#amP").text($a.find("p").text()); $("#amModal").prop("hidden", false);
    });
  }

  // ---------- gallery ----------
  if (page === "gallery") {
    var $items = $(".grid a"), cur = 0;
    $(".tabs button").on("click", function () {
      $(".tabs button").removeClass("on"); $(this).addClass("on"); var f = $(this).data("f");
      $items.each(function () { $(this).toggle(f === "all" || $(this).data("c") === f); });
    });
    function show(i) {
      var v = $items.filter(":visible"); cur = (i + v.length) % v.length;
      $(".lightbox img").attr("src", v.eq(cur).attr("href")).attr("alt", v.eq(cur).data("cap"));
      $(".lightbox figcaption").text(v.eq(cur).data("cap"));
    }
    $items.on("click", function (e) { e.preventDefault(); show($items.filter(":visible").index(this)); $(".lightbox").prop("hidden", false); });
    $(".nx").on("click", function () { show(cur + 1); }); $(".pv").on("click", function () { show(cur - 1); });
    $(document).on("keydown", function (e) { if ($(".lightbox").is(":visible")) { if (e.key === "ArrowRight") show(cur + 1); if (e.key === "ArrowLeft") show(cur - 1); } });
  }

  // ---------- booking ----------
  if (page === "booking") {
    var i;
    for (i = 1; i <= 6; i++) $("#ad").append($("<option>").text(i));
    for (i = 0; i <= 4; i++) $("#ch").append($("<option>").text(i));
    ROOMS.forEach(function (r) { $("#rt").append($("<option>").val(r.id).text(r.name + " (" + php(r.price) + "/night)")); });
    $("#ci").val(q.get("ci") || ""); $("#co").val(q.get("co") || ""); $("#rt").val(q.get("room") || ""); $("#ad").val(q.get("g") || 2);
    bind("#ci", "#co");
    var ok = false;
    function calc() {
      var a = $("#ci").val(), b = $("#co").val(), r = ROOMS[$("#rt").val() - 1], g = +$("#ad").val() + +$("#ch").val(), n = nights(a, b);
      var err = a || b ? validDates(a, b) : "", msg = "", step = 1; ok = false;
      $("#sIn").text(fmt(a)); $("#sOut").text(fmt(b)); $("#sG").text(g); $("#sN").text(Math.max(n, 0));
      if (a && b && !err) step = 2;
      if (r) { $("#sRoom").text(r.name); $("#sImg").attr({src: r.img, alt: r.name}); }
      else { $("#sRoom").text("Not selected"); }
      if (r && g > r.cap) err = r.name + " sleeps up to " + r.cap + " guests. Choose a bigger room or fewer guests.";
      if (r && !err && step === 2) {
        var u = left(r, a, b);
        if (u < 1) err = r.name + " is fully booked for those dates. Try other dates or another room.";
        else { msg = "Available: " + u + " " + (u > 1 ? "rooms" : "room") + " left for your dates."; ok = true; step = 3; }
      }
      var sub = ok ? r.price * n : 0;
      $("#sSub").text(php(sub)); $("#sTax").text(php(sub * TAX)); $("#sTot").text(php(sub * (1 + TAX)));
      $("#availMsg").text(err || msg).toggleClass("err", !!err);
      if (ok && $("#nm").val() && $("#em").val() && $("#ph").val() && $("#tc").is(":checked")) step = 4;
      $(".steps li").each(function () { var s = +$(this).data("s"); $(this).toggleClass("on", s === step).toggleClass("done", s < step); });
    }
    $("#bkForm").on("input change", "input,select,textarea", calc); calc();
    $("#bkForm").on("submit", function (e) {
      e.preventDefault(); calc();
      var m = "";
      if (!ok) m = "Complete your dates, guests and room first.";
      else if (!$("#nm").val().trim() || !$("#ph").val().trim()) m = "Enter your full name and phone number.";
      else if (!/^\S+@\S+\.\S+$/.test($("#em").val())) m = "Enter a valid email address.";
      else if (!$("#tc").is(":checked")) m = "Please accept the terms and cancellation policy.";
      $("#formMsg").text(m); if (m) return;
      var r = ROOMS[$("#rt").val() - 1], n = nights($("#ci").val(), $("#co").val()), ref = "AZB-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      var all = stored(); all.push({room: r.id, ci: $("#ci").val(), co: $("#co").val(), ref: ref, name: $("#nm").val()});
      try { localStorage.setItem("azul_bookings", JSON.stringify(all)); } catch (x) {}
      $("#doneTxt").text("Thank you, " + $("#nm").val() + ". " + r.name + ", " + fmt($("#ci").val()) + " to " + fmt($("#co").val()) + " (" + n + " nights). Total " + $("#sTot").text() + ". Reference: " + ref + ".");
      $("#done").prop("hidden", false); this.reset(); $("#ad").val(2); calc();
    });
  }

  // ---------- contact ----------
  if (page === "contact") {
    $("#cForm").on("submit", function (e) {
      e.preventDefault(); var m = "";
      if (!$("#cn1").val().trim()) m = "Enter your name.";
      else if (!/^\S+@\S+\.\S+$/.test($("#ce").val())) m = "Enter a valid email address.";
      else if (!$("#cm").val().trim()) m = "Write a message.";
      $("#cMsg").text(m || "Message sent. We reply within one working day.").toggleClass("err", !!m);
      if (!m) this.reset();
    });
  }
});
