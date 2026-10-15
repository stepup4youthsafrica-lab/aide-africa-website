const toggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav-links');
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',String(open));});}
const year=document.querySelector('[data-year]');if(year)year.textContent=new Date().getFullYear();
const amountButtons=[...document.querySelectorAll('[data-amount]')];
const amountInput=document.querySelector('#donation-amount');
amountButtons.forEach(btn=>btn.addEventListener('click',()=>{amountButtons.forEach(b=>b.classList.remove('active'));btn.classList.add('active');if(amountInput)amountInput.value=btn.dataset.amount;}));
async function startPayment(provider){
  const amount=Number(amountInput?.value);
  const currency=(document.querySelector('#currency')?.value||'USD').toUpperCase();
  const email=(document.querySelector('#donor-email')?.value||'').trim();
  const name=(document.querySelector('#donor-name')?.value||'').trim();
  const consent=document.querySelector('#donor-consent');
  const status=document.querySelector('#payment-status');
  if(!Number.isFinite(amount)||amount<1||amount>10000){status.textContent='Enter a donation amount between 1 and 10,000.';return;}
  if(!email||!/^\S+@\S+\.\S+$/.test(email)){status.textContent='Please enter a valid email address for your receipt.';return;}
  if(consent&&!consent.checked){status.textContent='Please confirm you have read the donation notice.';return;}
  status.textContent='Connecting securely to the payment provider…';
  document.querySelectorAll('[data-provider]').forEach(b=>b.disabled=true);
  try{
    const response=await fetch(`/api/donations/${provider}/create`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount,currency,email,name})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Payment could not be started.');
    if(!data.url)throw new Error('The payment provider did not return a checkout URL.');
    window.location.assign(data.url);
  }catch(err){status.textContent=err.message||'Payment could not be started. Please try again later.';document.querySelectorAll('[data-provider]').forEach(b=>b.disabled=false);}
}
document.querySelectorAll('[data-provider]').forEach(btn=>btn.addEventListener('click',()=>startPayment(btn.dataset.provider)));
const contactForm=document.querySelector('#contact-form');
if(contactForm){contactForm.addEventListener('submit',e=>{e.preventDefault();const out=document.querySelector('#contact-status');out.textContent='Thank you. This demo form is not connected to an inbox yet. Please configure a form service or backend before publishing.';});}
