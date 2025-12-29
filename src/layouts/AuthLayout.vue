<template>
  <div class="relative min-h-screen flex items-center justify-center bg-slate-100 overflow-hidden">
    <!-- Blurred color blobs -->
<div class="absolute w-72 h-72 bg-gradient-to-tr from-purple-200 to-purple-500 opacity-30 rounded-full blur-3xl top-10 -left-20"></div>
<div class="absolute w-96 h-96 bg-gradient-to-br from-sky-200 to-sky-400 opacity-30 rounded-full blur-3xl -bottom-20 right-0"></div>
<div class="absolute w-80 h-80 bg-purple-200 opacity-20 rounded-full blur-3xl -top-16 right-1/3"></div>
<div class="absolute w-96 h-72 bg-gradient-to-tr from-sky-300 to-purple-300 opacity-30 rounded-full blur-3xl"
      style="top:65%; left:35%; transform: translate(-50%, -50%)"></div>
      <div class="absolute w-28 h-28 bg-gradient-to-tr from-purple-300 to-purple-300 opacity-90 rounded-full blur-3xl"
      style="top:20%; right:5%; transform: translate(-50%, -50%)"></div>

    <!-- Auth content -->
    <main class="relative z-10 w-full max-w-sm rounded-xl">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
</script>
