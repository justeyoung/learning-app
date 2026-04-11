// --- Utility Functions ---

function getPercentage(current, target) {
  return Math.min((current / target) * 100, 100);
}

function getTimeProgress(start, end) {
  const now = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);

  const total = endDate - startDate;
  const elapsed = now - startDate;

  return Math.min((elapsed / total) * 100, 100);
}

function getDayProgress(start, end) {
  const now = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);

  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  return { elapsedDays, totalDays, remainingDays, startDate, endDate };
}

function renderBar(percent, length = 30) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${percent.toFixed(1)}%`;
}

function formatCurrency(value) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// --- STATUS LOGIC ---

function getStatus(timePct, totalPct) {
  if (totalPct > timePct) return "AHEAD OF RUNWAY";
  if (totalPct < timePct) return "BEHIND RUNWAY";
  return "ON TRACK";
}

// --- Main App ---

fetch('./data/runway.json')
  .then(res => res.json())
  .then(data => {

    const isa = data.isa;
    const sipp = data.sipp;

    const targetISA = data.targets.isa;
    const targetSIPP = data.targets.sipp;

    const total = isa + sipp;
    const totalTarget = targetISA + targetSIPP;

    const isaPct = getPercentage(isa, targetISA);
    const sippPct = getPercentage(sipp, targetSIPP);
    const totalPct = getPercentage(total, totalTarget);
    const timePct = getTimeProgress(data.start_date, data.end_date);

    const status = getStatus(timePct, totalPct);

    const { elapsedDays, totalDays, remainingDays, startDate, endDate } =
      getDayProgress(data.start_date, data.end_date);

    // --- Output ---

    const output = 
`THE RUNWAY
----------------------------------

STATUS: ${status}

Start:     ${formatDate(startDate)}
Today:     Day ${elapsedDays} / ${totalDays}
Remaining: ${remainingDays} days → ${formatDate(endDate)}

TIME
${renderBar(timePct)}

TOTAL INVESTMENT
${renderBar(totalPct)}

----------------------------------

ISA   £${formatCurrency(isa)} / £${formatCurrency(targetISA)}
${renderBar(isaPct)}

SIPP  £${formatCurrency(sipp)} / £${formatCurrency(targetSIPP)}
${renderBar(sippPct)}

----------------------------------
Last updated: ${data.last_updated}
`;

    document.getElementById('app').textContent = output;

  })
  .catch(err => {
    document.getElementById('app').textContent = "Error loading data.";
    console.error(err);
  });