<template>
  <VaModal
    class="big-form"
    :mobile-fullscreen="false"
    size="large"
    hide-default-actions
    :model-value="true"
    close-button
    @update:modelValue="emits('cancel')"
  >
    <template #header>
      <h1 class="va-h6 mb-2">{{ selectedUser ? 'Update User' : 'Add User' }}</h1>
    </template>

    <VaForm ref="form" @submit.prevent="submit">
      <div v-if="formData.updating === '' || formData.updating === 'all'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <VaInput
          v-model="formData.firstName"
          :rules="[validators.required]"
          label="First Name"
          required-mark
          placeholder="First Name"
          type="text"
        />
        <VaInput
          v-model="formData.lastName"
          :rules="[validators.required]"
          label="Last Name"
          required-mark
          placeholder="Last Name"
          type="text"
        />
        <VaInput v-model="formData.username" label="Username" placeholder="User Name" type="text" />

        <VaInput
          v-model="formData.email"
          :rules="[validators.required]"
          label="Email"
          required-mark
          placeholder="hello@abc.com"
          type="email"
        />
        <VaSelect v-model="formData.role" value-by="value" required-mark label="Type" :options="types" />

        <VaSelect
          v-model="formData.outlets"
          :rules="[validators.required]"
          required-mark
          label="Outlets"
          :options="outlets"
          :multiple="true"
          value-by="value"
        />
        <VaInput v-model="formData.posCreds.posId" label="POS Username" placeholder="POS ID" type="text" />
        <VaValue v-if="true" v-slot="isPosPasswordVisible" :default-value="false">
          <VaInput
            v-model="formData.posCreds.posPassword"
            :type="isPosPasswordVisible.value ? 'text' : 'password'"
            label="POS Password"
            placeholder="*******"
            @clickAppendInner="isPosPasswordVisible.value = !isPosPasswordVisible.value"
          >
            <template #appendInner>
              <VaIcon
                class="cursor-pointer"
                :name="isPosPasswordVisible.value ? 'visibility_off' : 'visibility'"
                size="small"
                color="primary"
              />
            </template>
          </VaInput>
        </VaValue>

        <VaValue v-if="!props.selectedUser" v-slot="isPasswordVisible" :default-value="false">
          <VaInput
            v-model="formData.password"
            :type="isPasswordVisible.value ? 'text' : 'password'"
            :rules="[validators.required]"
            required-mark
            label="Password"
            placeholder="######"
            @clickAppendInner="isPasswordVisible.value = !isPasswordVisible.value"
          >
            <template #appendInner>
              <VaIcon
                class="cursor-pointer"
                :name="isPasswordVisible.value ? 'visibility_off' : 'visibility'"
                size="small"
                color="primary"
              />
            </template>
          </VaInput>
        </VaValue>
        <VaSelect
          v-model="formData.paymentType"
          :disabled="!formData.outlets.length"
          :rules="[validators.required]"
          required-mark
          label="Payment Type"
          :options="paymentTypes"
          :multiple="true"
          text-by="name"
          value-by="paymentTypeId"
        />

        <VaSelect
          v-model="formData.allowedDeliveryZoneIds"
          :disabled="!formData.outlets.length"
          label="Allowed Delivery Zones"
          :options="deliveryZones"
          :multiple="true"
          text-by="name"
          value-by="_id"
        />
      </div>
    </VaForm>

    <template #footer>
      <div class="flex justify-end mt-4">
        <VaButton type="submit" @click="submit">
          {{ selectedUser ? 'Update' : 'Add' }}
        </VaButton>
      </div>
    </template>
  </VaModal>
</template>
<script lang="ts" setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import { validators } from '@/services/utils'
import { useServiceStore } from '@/stores/services'
import { useToast, useForm } from 'vuestic-ui'
const emits = defineEmits(['cancel'])
const props = defineProps({
  selectedUser: {
    type: Object || String,
    default: () => '',
  },
  paymentTypes: {
    type: Array,
    default: () => [],
  },
})
const { validate } = useForm('form')
const { init } = useToast()

const servicesStore = useServiceStore()
const paymentTypes = ref([])
const deliveryZones = ref([])
const formData = ref({
  firstName: '',
  username: '',
  lastName: '',
  email: '',
  password: '',
  posCreds: {
    posId: '',
    posPassword: '',
  },
  role: '',
  updating: '',
  outlets: [],
  paymentType: [],
  allowedDeliveryZoneIds: [],
})

const outlets = ref([])
const types = [
  { text: 'Admin', value: 'admin' },
  { text: 'Caller', value: 'caller' },
  { text: 'Caller & Editor', value: 'caller-editor' },
  { text: 'Editor', value: 'editor' },
]

const getOutlets = () => {
  servicesStore.getAll().then(() => {
    outlets.value = servicesStore.items.map((e) => {
      return { text: e.name, value: e._id }
    })
    // Auto-select if only one outlet is available
    if (outlets.value.length === 1 && !formData.value.outlets.length) {
      formData.value.outlets = [outlets.value[0].value]
    }
  })
}

const getPaymentOptions = (outletId) => {
  const url = import.meta.env.VITE_API_BASE_URL
  axios.get(`${url}/payments?outletId=${outletId}`).then((response) => {
    paymentTypes.value = response.data.data
  })
}

const getDeliveryZones = (outletId) => {
  const url = import.meta.env.VITE_API_BASE_URL
  axios
    .get(`${url}/deliveryZones/${outletId}`)
    .then((response) => {
      deliveryZones.value = response.data.data
    })
    .catch(() => {
      deliveryZones.value = []
    })
}

watch(
  () => formData.value.outlets,
  () => {
    if (formData.value.outlets.length) {
      getPaymentOptions(formData.value.outlets[0])
      getDeliveryZones(formData.value.outlets[0])
    } else {
      paymentTypes.value = []
      deliveryZones.value = []
    }
  },
)

// if (props.selectedUser) {
//   formData.value = props.selectedUser
//   formData.value.outlets = props.selectedUser.outlets.map((e) => e._id)
// }

if (props.selectedUser) {
  const user = JSON.parse(JSON.stringify(props.selectedUser))
  user.outlets = user.outlets?.map((e) => e._id) || []
  user.posCreds = user.posCreds || { posId: '', posPassword: '' }
  user.allowedDeliveryZoneIds = user.allowedDeliveryZoneIds || []
  formData.value = {
    ...formData.value,
    ...user,
  }
  // Initialize fetching based on existing outlet
  if (user.outlets.length) {
    getPaymentOptions(user.outlets[0])
    getDeliveryZones(user.outlets[0])
  }
}

const submit = () => {
  if (validate()) {
    const data = JSON.parse(JSON.stringify(formData.value))
    delete data.updating
    delete data.createdAt // delete createdAt key for unnecessary used
    delete data.updatedAt // delete updatedAt key for unnecessary used
    delete data.__v // delete __v key for unnecessary used

    const url: any = import.meta.env.VITE_API_BASE_URL
    if (props.selectedUser) {
      axios
        .patch(`${url}/users/${formData.value._id}`, data)
        .then((response) => {
          init({ message: "You've successfully updated a user", color: 'success' })
          emits('cancel')
        })
        .catch((err) => {
          init({ message: err.response.data.message, color: 'danger' })
        })
    } else {
      axios
        .post(`${url}/users`, data)
        .then((response) => {
          init({ message: "You've successfully created a user", color: 'success' })
          emits('cancel')
        })
        .catch((err) => {
          init({ message: err.response.data.message, color: 'danger' })
        })
    }
  }
}

getOutlets()
</script>
