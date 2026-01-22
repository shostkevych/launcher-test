<script>
  const greetings = [
    "Hello, wonderful human!",
    "Greetings from the digital realm!",
    "Hey there, awesome person!",
    "Welcome to this amazing app!",
    "Salutations, dear visitor!",
    "What's up, friend?",
    "Hi! Nice to see you here!",
    "Hello! Hope you're having a great day!",
    "Howdy, partner!",
    "Good day to you!"
  ];

  let currentGreeting = greetings[Math.floor(Math.random() * greetings.length)];

  function changeGreeting() {
    currentGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  }
</script>

<main>
  <div class="container">
    <h1>{currentGreeting}</h1>
    <button on:click={changeGreeting}>Get Another Greeting</button>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  main {
    width: 100%;
  }

  .container {
    text-align: center;
    background: white;
    padding: 3rem 2rem;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2.5rem;
    color: #667eea;
    margin: 0 0 2rem 0;
    animation: fadeIn 0.5s ease-in;
  }

  button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 1rem 2rem;
    font-size: 1.1rem;
    border-radius: 50px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    font-weight: 600;
  }

  button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
  }

  button:active {
    transform: translateY(0);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
