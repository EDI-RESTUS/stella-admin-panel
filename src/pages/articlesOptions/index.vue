<template>
  <div>
    <div class="rounded bg-white w-full mt-4">
      <!-- Display Tab Content -->
      <RouterView />
    </div>
  </div>
</template>

<script>
export default {
  name: 'ArticlesOptionsPage',
  data() {
    return {
      activeTab: 1,
    }
  },
  watch: {
    activeTab() {
      if (this.activeTab === 0 && this.$route.name !== 'articlesOptionsGroups') {
        this.$router.push({ name: 'articlesOptionsGroups' })
      } else if (this.activeTab === 1 && this.$route.name !== 'articlesOptionsList') {
        this.$router.push({ name: 'articlesOptionsList' })
      }
    },
  },
  mounted() {
    if (this.$route.name === 'articlesOptionsGroups') {
      this.activeTab = 0
    } else {
      this.activeTab = 1
    }
  },
}
</script>

<style scoped>
/* Modern pill-style tab buttons only */
.tab-btn {
  padding: 0.4rem 1.2rem;
  border-radius: 9999px;
  border: 1px solid transparent;
  background-color: rgb(233, 237, 241);
  color: #475569;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease-in-out;
  min-width: 200px;
  text-align: center;
  font-size: 15px;
}

.tab-btn:hover {
  background-color: rgba(221, 227, 235, 0.9);
  color: #0f172a;
}

.tab-btn.active {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
  font-weight: 600;
}
</style>
