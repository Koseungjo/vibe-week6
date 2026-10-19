(() => {
  "use strict";

  const storageKey = "sj-start-daily-focus-v1";
  const today = new Date();
  const dateKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  const dateLabel = document.getElementById("today");
  const focusForm = document.getElementById("focus-form");
  const focusInput = document.getElementById("daily-focus");
  const focusStatus = document.getElementById("focus-status");

  dateLabel.dateTime = dateKey;
  dateLabel.textContent = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(today);

  function setStatus(message, state = "success") {
    focusStatus.textContent = message;
    focusStatus.dataset.state = state;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (saved && saved.date === dateKey && typeof saved.text === "string") {
      focusInput.value = saved.text.slice(0, 120);
      if (focusInput.value) setStatus("오늘의 기록을 불러왔어요.");
    }
  } catch {
    setStatus("저장 공간을 사용할 수 없어 기록을 불러오지 못했어요.", "error");
  }

  focusInput.addEventListener("input", () => {
    setStatus("수정한 내용을 저장해 주세요.");
  });

  focusForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = focusInput.value.trim();
    try {
      if (text) {
        localStorage.setItem(storageKey, JSON.stringify({ date: dateKey, text }));
        focusInput.value = text;
        setStatus("저장했어요. 오늘도 한 걸음씩!");
      } else {
        localStorage.removeItem(storageKey);
        focusInput.value = "";
        setStatus("오늘의 기록을 비웠어요.");
      }
    } catch {
      setStatus("저장하지 못했어요. 브라우저의 저장 공간 설정을 확인해 주세요.", "error");
    }
  });
})();
