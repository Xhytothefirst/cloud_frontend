<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path)
</script>

<template>
  <el-container :style="{ height: '100vh' }">
    <el-header
      :height="'48px'"
      :style="{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        borderBottom: '1px solid #e4e7ed',
      }"
    >
      <div :style="{ fontSize: '20px', fontWeight: 700, letterSpacing: '2px', color: '#303133' }">
        STOCK
      </div>
      <el-avatar :size="32" />
    </el-header>

    <el-container :style="{ flex: '1', minHeight: '0' }">
      <el-aside width="200px">
        <el-menu :default-active="activeMenu" router>
          <el-menu-item index="/">
            <template #title>库存总览</template>
          </el-menu-item>
          <el-menu-item index="/inbound">
            <template #title>入库管理</template>
          </el-menu-item>
          <el-menu-item index="/brand">
            <template #title>品牌管理</template>
          </el-menu-item>
          <el-menu-item index="/log">
            <template #title>操作日志</template>
          </el-menu-item>
          <el-menu-item index="/settings">
            <template #title>系统设置</template>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-main :style="{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }">
          <router-view v-slot="{ Component }">
            <component
              :is="Component"
              :style="{ flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' }"
            />
          </router-view>
        </el-main>

        <el-footer>
          <el-text type="info">Stock Frontend</el-text>
        </el-footer>
      </el-container>
    </el-container>
  </el-container>
</template>