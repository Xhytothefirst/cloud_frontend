<script setup lang="ts"></script>

<template>
  <div :style="{ height: '100%' }">
    <el-page-header title="返回" content="系统设置">
      <template #content>
        <span><strong>系统设置</strong></span>
      </template>
    </el-page-header>
    <el-text type="info">管理提醒与账户</el-text>

    <el-divider />

    <el-card style="margin-bottom: 16px">
      <template #header>提醒设置</template>
    </el-card>

    <el-card>
      <template #header>账户设置</template>
    </el-card>
  </div>
</template>
