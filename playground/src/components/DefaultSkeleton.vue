<template>
  <div class="default-skeleton">
    <div class="skeleton-header">
      <div class="skeleton-line skeleton-line--short"></div>
    </div>
    <div class="skeleton-body">
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-line--medium"></div>
      <div class="skeleton-line skeleton-line--long"></div>
    </div>
  </div>
</template>

<style scoped>
.default-skeleton {
  background: #1e293b;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-header {
  margin-bottom: 0.5rem;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-line {
  height: 1rem;
  border-radius: 0.25rem;
  background: linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  width: 100%;
}

.skeleton-line--short {
  width: 40%;
  height: 1.25rem;
}

.skeleton-line--medium {
  width: 70%;
}

.skeleton-line--long {
  width: 90%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
