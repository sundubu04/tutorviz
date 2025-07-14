const buttons = document.querySelectorAll('.bottom-nav button');
const tabs = document.querySelectorAll('.tab');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);

    tabs.forEach(tab => tab.classList.remove('active'));
    buttons.forEach(b => b.classList.remove('active'));

    btn.classList.add('active');
    target.classList.add('active');
  });
});
