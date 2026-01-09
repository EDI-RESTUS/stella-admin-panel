<template>
  <div>
    <VaForm v-if="!loading" ref="form" @submit="restaurantId ? updateRestaurant() : createRestaurant()">
      <div class="flex flex-row justify-between md:items-center mt-4">
        <h1 class="mb-3 font-bold text-lg">Restaurant Details</h1>
        <div class="flex gap-x-4 ml-auto mb-3">
          <VaButton :disabled="!restaurantData.name" type="submit">{{ restaurantId ? 'Save' : 'Create' }}</VaButton>
          <VaButton preset="primary">Reset</VaButton>
        </div>
      </div>

      <VaCard>
        <VaCardContent>
          <div class="flex-col justify-start items-start gap-4 inline-flex w-full">
            <div class="grid grid-cols-4 gap-6 w-full mt-4">
              <div class="col-span-1">
                <VaInput
                  id="name"
                  v-model="restaurantData.name"
                  label="Name"
                  name="Name"
                  required-mark
                  :rules="[validators.required]"
                />
              </div>
              <div class="col-span-1">
                <VaInput id="slug" v-model="restaurantData.slug" label="Slug" name="slug" />
              </div>
              <div class="col-span-1">
                <VaInput id="address" v-model="restaurantData.address" label="Address" name="Address" />
              </div>
              <div class="col-span-1">
                <VaSelect
                  id="type"
                  v-model="restaurantData.type"
                  label="Type"
                  :options="types"
                  allow-create
                  required-mark
                  :rules="[validators.required]"
                  option-value="_id"
                  @createNew="addNewOption"
                />
              </div>
              <div class="col-span-4">
                <VaTextarea
                  id="description"
                  v-model="restaurantData.description"
                  label="Description"
                  name="Description"
                  :min-rows="3"
                  :max-rows="3"
                  class="w-full"
                />
              </div>
            </div>

            <div class="grid grid-cols-4 gap-8 w-full mt-4">
              <VaInput
                id="postcode"
                v-model="restaurantData.postcode"
                label="Postcode"
                name="Postcode"
                type="text"
                :rules="[validators.required]"
                required-mark
              />
              <VaInput id="email" v-model="restaurantData.email" label="Email" name="Email" type="email" />
              <VaInput id="phone" v-model="restaurantData.phone" label="Phone" name="phone" type="number" />
              <VaInput id="facebook" v-model="restaurantData.facebook" label="Facebook" name="Facebook" type="url" />
            </div>
            <div class="grid grid-cols-4 gap-8 w-full mt-4">
              <VaInput
                id="instagram"
                v-model="restaurantData.instagram"
                label="Instagram"
                name="Instagram"
                type="url"
              />
              <VaInput id="twitter" v-model="restaurantData.twitter" label="Twitter" name="Twitter" type="url" />
              <VaInput id="website" v-model="restaurantData.website" label="Website" name="Website" type="url" />
              <VaInput id="tripadvisor" v-model="restaurantData.tripadvisor" label="TripAdvisor" name="tripadvisor" />
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <h1 class="mb-3 mt-6 font-bold text-lg">Configuration</h1>
      <VaCard>
        <VaCardContent>
          <div class="flex-col justify-start items-start gap-4 inline-flex w-full">
            <div class="flex flex-col gap-8 sm:flex-row w-full config">
              <VaSwitch v-model="restaurantData.active" label="Active " left-label size="small" />
              <VaSelect
                v-model="restaurantData.operatingMode"
                label="Operating Mode"
                class="sm:w-1/6"
                :options="mode"
                :track-by="(option) => option.value"
                :value-by="(option) => option.value"
                :rules="[validators.required]"
                required-mark
              />
            </div>

            <div class="flex flex-col w-full mt-3" :rules="[validators.required]">
              <div class="font-bold">
                POS:
                <sup v-if="restaurantData.operatingMode === 'onlineOrdering'" class="red">*</sup>
              </div>
              <div class="flex gap-8 flex-col sm:flex-row w-full config mt-2">
                <VaSwitch
                  :key="restaurantData.operatingMode"
                  v-model="restaurantData.pos"
                  true-value="winmax"
                  class="w-fit"
                  label="Winmax"
                  left-label
                  size="small"
                  :required-mark="restaurantData.operatingMode === 'onlineOrdering'"
                  :rules="restaurantData.operatingMode === 'onlineOrdering' ? [validators.required] : []"
                />
                <VaSwitch
                  :key="restaurantData.operatingMode"
                  v-model="restaurantData.pos"
                  true-value="restus"
                  class="w-fit"
                  label="Restus"
                  left-label
                  size="small"
                  :required-mark="restaurantData.operatingMode === 'onlineOrdering'"
                  :rules="restaurantData.operatingMode === 'onlineOrdering' ? [validators.required] : []"
                />
              </div>
              <div v-if="restaurantData.pos == 'winmax'" class="grid grid-cols-4 gap-8 w-full mt-4">
                <VaInput
                  v-model="restaurantData.winmaxConfig.company"
                  label="Company"
                  name="Company"
                  placeholder="Company"
                />
                <VaInput v-model="restaurantData.winmaxConfig.user" label="User" name="User" placeholder="User" />
                <VaInput
                  v-model="restaurantData.winmaxConfig.password"
                  name="Password"
                  label="Password"
                  placeholder="Password"
                  type="password"
                />
                <VaInput
                  v-model="restaurantData.winmaxConfig.terminal"
                  name="Terminal"
                  label="Terminal"
                  placeholder="Terminal"
                  type="number"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mt-4">
              <div class="space-y-4" :rules="[validators.required]">
                <div class="font-bold mb-5">Opening Times:</div>
                <div class="flex flex-col space-y-2">
                  <VaRadio
                    :key="restaurantData.operatingMode"
                    v-model="restaurantData.openingTimes.selected"
                    :options="[
                      { value: 'daily', text: 'Daily' },
                      { value: 'byDay', text: 'by Day' },
                      { value: 'is24h', text: '24 hours' },
                    ]"
                    value-by="value"
                    size="small"
                    class="w-fit"
                    :required-mark="restaurantData.operatingMode === 'onlineOrdering'"
                    :rules="restaurantData.operatingMode === 'onlineOrdering' ? [validators.required] : []"
                  />

                  <div v-if="restaurantData.openingTimes.selected === 'daily'" class="flex items-center gap-4">
                    <input
                      :key="restaurantData.operatingMode"
                      v-model="restaurantData.openingTime"
                      type="time"
                      :required-mark="restaurantData.operatingMode === 'onlineOrdering'"
                      :rules="restaurantData.operatingMode === 'onlineOrdering' ? [validators.required] : []"
                      class="border border-1 h-8 min-w-[140px] p-4 rounded"
                    />
                    <span class="font-semibold">to</span>
                    <input
                      v-model="restaurantData.closingTime"
                      type="time"
                      :required-mark="restaurantData.operatingMode === 'onlineOrdering'"
                      :rules="restaurantData.operatingMode === 'onlineOrdering' ? [validators.required] : []"
                      class="border border-1 h-8 min-w-[140px] p-4 rounded"
                    />
                  </div>
                </div>

                <div class="flex flex-col space-y-2">
                  <div v-if="restaurantData.openingTimes.selected === 'byDay'" class="grid grid-cols-1 gap-2">
                    <div
                      v-for="(day, index) in [
                        'Monday',
                        'Tuesday',
                        'Wednesday',
                        'Thursday',
                        'Friday',
                        'Saturday',
                        'Sunday',
                      ]"
                      :key="index"
                      class="flex items-center space-x-2"
                    >
                      <span class="w-20 day">{{ day }}</span>

                      <input
                        v-model="restaurantData[`${day.toLowerCase()}Opening`]"
                        type="time"
                        class="border border-1 h-8 min-w-[120px] px-2 rounded"
                      />
                      <span class="font-semibold">-</span>
                      <input
                        v-model="restaurantData[`${day.toLowerCase()}Closing`]"
                        type="time"
                        class="border border-1 h-8 min-w-[120px] px-2 rounded"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div class="font-bold flex items-center gap-2">
                  Delivery Times:
                  <VaSwitch v-model="restaurantData.delivery.enabled" class="w-fit" size="small" />
                </div>
                <div v-if="restaurantData.delivery.enabled">
                  <div class="flex flex-col space-y-2">
                    <VaRadio
                      v-model="restaurantData.delivery.openingTimes.selected"
                      :options="[
                        { value: 'daily', text: 'Daily' },
                        { value: 'byDay', text: 'by Day' },
                        { value: 'is24h', text: '24 hours' },
                      ]"
                      value-by="value"
                      size="small"
                      class="w-fit"
                    />
                    <div
                      v-if="restaurantData.delivery.openingTimes.selected === 'daily'"
                      class="flex items-center gap-4"
                    >
                      <input
                        v-model="restaurantData.delivery.openingTimes.daily.opens"
                        type="time"
                        class="border border-1 h-8 min-w-[140px] p-4 rounded"
                      />
                      <span class="font-semibold">to</span>
                      <input
                        v-model="restaurantData.delivery.openingTimes.daily.closes"
                        type="time"
                        class="border border-1 h-8 min-w-[140px] p-4 rounded"
                      />
                    </div>
                  </div>

                  <div class="flex flex-col space-y-2 mt-4">
                    <div
                      v-if="restaurantData.delivery.openingTimes.selected === 'byDay'"
                      class="grid grid-cols-1 gap-2"
                    >
                      <div
                        v-for="(day, index) in [
                          'Monday',
                          'Tuesday',
                          'Wednesday',
                          'Thursday',
                          'Friday',
                          'Saturday',
                          'Sunday',
                        ]"
                        :key="'delivery-' + index"
                        class="flex items-center space-x-2"
                      >
                        <span class="w-20 day">{{ day }}</span>
                        <input
                          v-model="restaurantData.delivery.openingTimes.byDay[day.toLowerCase()].opens"
                          type="time"
                          :label="day"
                          class="border border-1 h-8 min-w-[120px] px-2 rounded"
                        />
                        <span class="font-semibold">-</span>
                        <input
                          v-model="restaurantData.delivery.openingTimes.byDay[day.toLowerCase()].closes"
                          type="time"
                          class="border border-1 h-8 min-w-[120px] px-2 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-4">
                <div class="font-bold flex items-center gap-2">
                  Takeaway Times:
                  <VaSwitch v-model="restaurantData.takeaway.enabled" class="w-fit" size="small" />
                </div>
                <div v-if="restaurantData.takeaway.enabled">
                  <div class="flex flex-col space-y-2">
                    <VaRadio
                      v-model="restaurantData.takeaway.openingTimes.selected"
                      :options="[
                        { value: 'daily', text: 'Daily' },
                        { value: 'byDay', text: 'by Day' },
                        { value: 'is24h', text: '24 hours' },
                      ]"
                      value-by="value"
                      size="small"
                      class="w-fit"
                    />
                    <div
                      v-if="restaurantData.takeaway.openingTimes.selected === 'daily'"
                      class="flex items-center gap-4"
                    >
                      <input
                        v-model="restaurantData.takeaway.openingTimes.daily.opens"
                        type="time"
                        class="border border-1 h-8 min-w-[140px] p-4 rounded"
                      />
                      <span class="font-semibold">to</span>
                      <input
                        v-model="restaurantData.takeaway.openingTimes.daily.closes"
                        type="time"
                        class="border border-1 h-8 min-w-[140px] p-4 rounded"
                      />
                    </div>
                  </div>

                  <div class="flex flex-col space-y-2 mt-4">
                    <div
                      v-if="restaurantData.takeaway.openingTimes.selected === 'byDay'"
                      class="grid grid-cols-1 gap-2"
                    >
                      <div
                        v-for="(day, index) in [
                          'Monday',
                          'Tuesday',
                          'Wednesday',
                          'Thursday',
                          'Friday',
                          'Saturday',
                          'Sunday',
                        ]"
                        :key="index"
                        class="flex items-center space-x-2"
                      >
                        <span class="w-20 day">{{ day }}</span>
                        <input
                          v-model="restaurantData.takeaway.openingTimes.byDay[day.toLowerCase()].opens"
                          type="time"
                          :label="day"
                          class="border border-1 h-8 min-w-[120px] px-2 rounded"
                        />
                        <span class="font-semibold">-</span>
                        <input
                          v-model="restaurantData.takeaway.openingTimes.byDay[day.toLowerCase()].closes"
                          type="time"
                          class="border border-1 h-8 min-w-[120px] px-2 rounded"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full mt-4">
              <VaTextarea
                v-model="restaurantData.dineInConfirmationMessage"
                label="Dine-in Confirmation Message"
                class="w-full"
              />

              <VaTextarea
                v-model="restaurantData.deliveryConfirmationMessage"
                label="Delivery Confirmation Message"
                class="w-full"
              />

              <VaTextarea
                v-model="restaurantData.takeawayConfirmationMessage"
                label="Takeaway Confirmation Message"
                class="w-full"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-6 gap-4 w-full mt-4">
              <VaInput v-model="restaurantData.orderTimeLimit" label="Order Time Limit" type="number" class="w-full" />

              <VaInput v-model="restaurantData.closingSoonMinutes" label="Closing Soon" type="number" class="w-full" />

              <VaInput v-model="restaurantData.minimumCharge" label="Minimum Charge" type="number" class="w-full" />

              <VaInput v-model="restaurantData.foodArticleNotes" label="Food Article Notes" class="w-full" />

              <VaInput v-model="restaurantData.drinkArticleNotes" label="Drink Article Notes" class="w-full" />

              <VaInput v-model="restaurantData.orderNotes" label="Order Notes" class="w-full" />

              <VaInput v-model="restaurantData.DeliveryNotes" label="Delivery Notes" class="w-full" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4 w-full mt-4">
              <div class="w-full">
                <VaSwitch
                  v-model="restaurantData.guestUsers"
                  :true-value="true"
                  label="Guest Users"
                  left-label
                  size="small"
                />
              </div>

              <div class="w-full">
                <VaSwitch
                  v-model="restaurantData.guestCheckout"
                  :true-value="true"
                  label="Guest Checkout"
                  left-label
                  size="small"
                />
              </div>

              <div class="w-full">
                <VaSwitch
                  v-model="restaurantData.repeatLastOrder"
                  :true-value="true"
                  label="Repeat Last Order"
                  left-label
                  size="small"
                />
              </div>

              <div class="w-full">
                <VaSwitch v-model="restaurantData.tabs" :true-value="true" label="Tabs" left-label size="small" />
              </div>

              <div class="w-full">
                <VaSwitch v-model="restaurantData.tips" :true-value="true" label="Tips" left-label size="small" />
              </div>
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <h1 class="mb-3 mt-6 font-bold text-lg">Design</h1>
      <VaCard>
        <VaCardContent>
          <div class="flex-col justify-start items-start gap-4 inline-flex w-full">
            <div class="flex gap-8 flex-col sm:flex-row sm:items-center w-full">
              <VaColorInput
                v-model="restaurantData.primaryColor"
                label="Primary Color"
                placeholder="#000"
                class="w-28"
              />
              <VaColorInput
                v-model="restaurantData.secondaryColor"
                label="Secondary Color"
                placeholder="#000"
                class="w-28"
              />
              <VaColorInput
                v-model="restaurantData.backgroundColor"
                label="Background Color"
                placeholder="#000"
                class="w-28"
              />
              <VaColorInput v-model="restaurantData.textColor" label="Text Color" placeholder="#000" class="w-28" />
              <VaColorInput v-model="restaurantData.headerColor" label="Header Color" placeholder="#000" class="w-28" />
              <VaColorInput v-model="restaurantData.footerColor" label="Footer Color" placeholder="#000" class="w-28" />
              <VaSwitch
                v-model="restaurantData.hideHeader"
                :true-value="true"
                label="Hide Header"
                left-label
                size="small"
              />
              <VaSwitch
                v-model="restaurantData.hideLogo"
                :true-value="true"
                label="Hide Logo"
                left-label
                size="small"
              />
              <VaSwitch
                v-model="restaurantData.hideDetails"
                :true-value="true"
                label="Hide Outlet details"
                left-label
                size="small"
              />
            </div>
            <div class="flex flex-col sm:flex-row w-full gap-1">
              <div class="flex-1">
                <label
                  class="va-input-label va-input-wrapper__label va-input-wrapper__label--outer mt-2"
                  style="color: var(--va-primary)"
                  >Logo Image</label
                >
                <FileUpload
                  :selected-rest="restaurantData._id"
                  @uploadSuccess="(data) => setImage(data, 'logo')"
                ></FileUpload>
                <div class="flex items-center">
                  <img v-if="restaurantData.logoUrl" :src="restaurantData.logoUrl" alt="Logo" class="w-32 h-32 mt-2" />
                  <VaButton
                    v-if="restaurantData.logoUrl"
                    preset="primary"
                    size="medium"
                    color="danger"
                    icon="mso-delete"
                    class="ml-2 h-6 w-6"
                    @click="deleteAsset('logo')"
                  />
                </div>
              </div>
              <div class="flex-1">
                <label
                  class="va-input-label va-input-wrapper__label va-input-wrapper__label--outer mt-2"
                  style="color: var(--va-primary)"
                  >Header Image</label
                >
                <FileUpload
                  :selected-rest="restaurantData._id"
                  @uploadSuccess="(data) => setImage(data, 'header')"
                ></FileUpload>
                <div class="flex items-center">
                  <img
                    v-if="restaurantData.headerUrl"
                    :src="restaurantData.headerUrl"
                    alt="Logo"
                    class="w-32 h-32 mt-2"
                  />
                  <VaButton
                    v-if="restaurantData.headerUrl"
                    preset="primary"
                    size="medium"
                    color="danger"
                    icon="mso-delete"
                    class="ml-2 h-6 w-6"
                    @click="deleteAsset('header')"
                  />
                </div>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4 w-full mt-4">
              <VaInput v-model="restaurantData.fontFamily" label="Font Family" type="font" class="w-full" />
              <div class="flex-1">
                <label
                  class="va-input-label va-input-wrapper__label va-input-wrapper__label--outer"
                  style="color: var(--va-primary)"
                  >Font URL</label
                >
                <FileUpload
                  v-if="!restaurantData.fontUrl"
                  :selected-rest="restaurantData._id"
                  :file-type="file"
                  @uploadSuccess="(data) => setImage(data, 'font')"
                />
                <div v-else class="flex items-center gap-2">
                  <VaInput v-model="restaurantData.fontUrl" type="url" disabled class="flex-1" />
                  <VaButton
                    v-if="restaurantData.fontUrl"
                    preset="primary"
                    size="medium"
                    color="danger"
                    icon="mso-delete"
                    class="h-6 w-6"
                    @click="deleteAsset('font')"
                  />
                </div>
              </div>
            </div>
          </div>
        </VaCardContent>
      </VaCard>
    </VaForm>
    <VaSkeletonGroup v-else>
      <VaCard>
        <VaSkeleton variant="squared" height="120px" />
        <VaCardContent class="flex items-center">
          <VaSkeleton variant="circle" width="1rem" height="48px" />
          <VaSkeleton variant="text" class="ml-2" :lines="2" />
        </VaCardContent>
        <VaCardContent>
          <VaSkeleton variant="text" :lines="4" text-width="50%" />
        </VaCardContent>
        <VaCardActions class="flex justify-end">
          <VaSkeleton class="mr-2" variant="rounded" inline width="64px" height="32px" />
          <VaSkeleton variant="rounded" inline width="64px" height="32px" />
        </VaCardActions>
      </VaCard>
    </VaSkeletonGroup>
  </div>
</template>

<script>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useToast, useForm } from 'vuestic-ui'
const { validate } = useForm()
import FileUpload from '@/components/file-uploader/FileUpload.vue'
import { validators, removeNulls } from '../../services/utils.ts'
import { useServiceStore } from '@/stores/services'
export default {
  components: {
    FileUpload,
  },
  beforeRouteLeave(to, from, next) {
    if (!this.restaurantId && !this.isProgrammaticNavigation) {
      const answer = window.confirm('Do you really want to leave this page. If any changes, it will be not saved?')
      if (answer) {
        next()
      } else {
        next(false)
      }
    } else {
      next()
    }
  },
  setup() {
    const types = ref([])
    const mode = ref([
      { text: 'view Only', value: 'viewOnly' },
      { text: 'Online Ordering', value: 'onlineOrdering' },
    ])
    const serviceStore = useServiceStore()
    const selectedType = ref(null)
    const selectedTypeMode = ref(null)
    const route = useRoute()
    const restaurantId = route.params.id
    const { init } = useToast()
    const loading = ref(false)

    const url = import.meta.env.VITE_API_BASE_URL

    const fetchOutletTypes = async () => {
      try {
        const response = await axios.get(`${url}/outlet-types`)
        types.value = response.data?.data?.map((item) => item.name).sort((a, b) => a.localeCompare(b)) || []
      } catch (error) {
        init({ message: 'Failed to fetch outlet types', color: 'danger' })
      }
    }

    const addNewOption = async (newOption) => {
      try {
        const response = await axios.post(`${url}/outlet-types`, {
          name: newOption,
        })

        types.value.push(response.data.data.name)
        types.value.sort((a, b) => a.localeCompare(b))

        selectedType.value = response.data.data.name

        init({ message: `"${newOption}" added successfully!`, color: 'success' })
      } catch (error) {
        const msg = error?.response?.data?.message || 'Failed to add type'
        init({ message: msg, color: 'danger' })
      }
    }
    fetchOutletTypes()

    const parseTime = (input) => {
      if (/^\d{2}:\d{2}$/.test(input)) {
        const [hours, minutes] = input.split(':').map(Number)
        return { hours, minutes }
      }
      return null
    }

    return {
      parseTime,
      types,
      mode,
      selectedType,
      selectedTypeMode,
      loading,
      restaurantId,
      serviceStore,
      init,
      validators,
      addNewOption,
    }
  },
  data() {
    return {
      isProgrammaticNavigation: false,
      restaurantData: {
        name: '',
        description: '',
        slug: '',
        type: '',
        address: '',
        postcode: '',
        email: '',
        phone: '',
        facebook: '',
        instagram: '',
        twitter: '',
        website: '',
        tripadvisor: '',
        active: false,
        winmax: false,
        company: '',
        logoUrl: '',
        headerUrl: '',
        user: '',
        password: '',
        terminal: null,
        restaurant_id: '',
        restus: false,
        operatingMode: '',
        orderTimeLimit: null,
        openingTime: '',
        closingTime: '',
        mondayOpening: '',
        mondayClosing: '',
        tuesdayOpening: '',
        tuesdayClosing: '',
        wednesdayOpening: '',
        wednesdayClosing: '',
        thursdayOpening: '',
        thursdayClosing: '',
        fridayOpening: '',
        fridayClosing: '',
        saturdayOpening: '',
        saturdayClosing: '',
        sundayOpening: '',
        sundayClosing: '',
        hours: false,
        closingSoonMinutes: null,
        winmaxConfig: {
          company: '',
          user: '',
          password: '',
          terminal: '',
        },
        openingTimes: {
          selected: '',
          byDay: {
            monday: { opens: '', closes: '' },
            tuesday: { opens: '', closes: '' },
            wednesday: { opens: '', closes: '' },
            thursday: { opens: '', closes: '' },
            friday: { opens: '', closes: '' },
            saturday: { opens: '', closes: '' },
            sunday: { opens: '', closes: '' },
          },
        },
        delivery: {
          enabled: false,
          openingTimes: {
            selected: '',
            daily: {
              opens: '',
              closes: '',
            },
            byDay: {
              monday: { opens: '', closes: '' },
              tuesday: { opens: '', closes: '' },
              wednesday: { opens: '', closes: '' },
              thursday: { opens: '', closes: '' },
              friday: { opens: '', closes: '' },
              saturday: { opens: '', closes: '' },
              sunday: { opens: '', closes: '' },
            },
            is24h: false,
          },
        },
        takeaway: {
          enabled: false,
          openingTimes: {
            selected: '',
            daily: {
              opens: '',
              closes: '',
            },
            byDay: {
              enabled: false,
              monday: { opens: '', closes: '' },
              tuesday: { opens: '', closes: '' },
              wednesday: { opens: '', closes: '' },
              thursday: { opens: '', closes: '' },
              friday: { opens: '', closes: '' },
              saturday: { opens: '', closes: '' },
              sunday: { opens: '', closes: '' },
            },
            is24h: false,
          },
        },
        guestUsers: false,
        guestCheckout: false,
        repeatLastOrder: false,
        minChange: false,
        minimumCharge: null,
        foodArticle: false,
        foodArticleNotes: '',
        drinkArticle: false,
        drinkArticleNotes: '',
        orderNotes: '',
        deliveryNotes: '',
        dineInConfirmationMessage: '',
        deliveryConfirmationMessage: '',
        takeawayConfirmationMessage: '',
        tabs: false,
        tips: false,
        primaryColor: '',
        secondaryColor: '',
        backgroundColor: '',
        textColor: '',
        headerColor: '',
        footerColor: '',
        fontFamily: '',
        fontUrl: '',
        hideHeader: '',
        hideLogo: '',
        hideDetails: '',
      },
      active: true,
      isGalleryViewEnabled: true,
      undoDuration: 5000,
      deletedFileMessage: 'File exterminated',
      undoButtonText: 'Cancel',
      uploadLogoText: 'Upload Logo',
      uploadHeaderText: 'Upload Header',
      colorPicker: '#FF002',
    }
  },
  computed: {
    galleryType() {
      return this.isGalleryViewEnabled ? 'gallery' : 'list'
    },
    selectedRest() {
      return this.serviceStore.selectedRest
    },
  },
  watch: {
    selectedRest() {
      this.$router.push({
        name: this.$route.name,
        params: {
          id: this.selectedRest,
        },
      })
      this.restaurantId = this.selectedRest
      this.fetchRestaurantDetails()
    },
  },
  mounted() {
    this.fetchRestaurantDetails()
  },
  methods: {
    // addNewOption(newOption) {
    //   this.types = [...this.types, newOption]
    // },
    parseTimeToDate(timeString) {
      return timeString
    },
    setImage(data, type) {
      if (this.restaurantData.assetIds) {
        if (this.restaurantData.assetIds.find((a) => a.assetType === type)) {
          const index = this.restaurantData.assetIds.findIndex((a) => a.assetType === type)
          this.restaurantData.assetIds[index].id = data._id
          this.restaurantData.assetIds[index].assetType = data.type
        } else {
          this.restaurantData.assetIds.push({
            id: data._id,
            assetType: type,
          })
        }
      } else {
        this.restaurantData.assetIds = [
          {
            id: data._id,
            assetType: type,
          },
        ]
      }
      if (type === 'logo') {
        this.restaurantData.logoUrl = data.url
      } else if (type === 'header') {
        this.restaurantData.headerUrl = data.url
      } else if (type === 'font') {
        this.restaurantData.fontUrl = data.url
      }
    },
    deleteAsset(type) {
      const image = this.restaurantData.assetIds.find((a) => a.assetType === type)
      const url = import.meta.env.VITE_API_BASE_URL
      if (this.restaurantData.assetIds && image) {
        axios
          .delete(`${url}/assets/${image.id}`)
          .then(() => {
            this.init({ message: 'Asset deleted successfully', color: 'success' })
          })
          .catch((err) => {
            this.init({ message: err.response.data.error, color: 'danger' })
          })
      }
      if (type === 'logo') {
        this.restaurantData.logoUrl = ''
      } else if (type === 'header') {
        this.restaurantData.headerUrl = ''
      } else if (type === 'font') {
        this.restaurantData.fontUrl = ''
      }
    },
    async fetchRestaurantDetails() {
      if (this.restaurantId) {
        this.loading = true
        const url = import.meta.env.VITE_API_BASE_URL
        try {
          const response = await axios.get(`${url}/outlets/${this.restaurantId}`)
          const res = response.data ? response.data : null
          if (res) {
            res.openingTime = res.openingTimes.daily.opens ? this.parseTimeToDate(res.openingTimes.daily.opens) : ''
            res.closingTime = res.openingTimes.daily.closes ? this.parseTimeToDate(res.openingTimes.daily.closes) : ''
            res.mondayOpening = res.openingTimes.byDay.monday.opens
              ? this.parseTimeToDate(res.openingTimes.byDay.monday.opens)
              : ''
            res.mondayClosing = res.openingTimes.byDay.monday.closes
              ? this.parseTimeToDate(res.openingTimes.byDay.monday.closes)
              : ''
            res.tuesdayOpening = res.openingTimes.byDay.tuesday.opens
              ? this.parseTimeToDate(res.openingTimes.byDay.tuesday.opens)
              : ''
            res.tuesdayClosing = res.openingTimes.byDay.tuesday.closes
              ? this.parseTimeToDate(res.openingTimes.byDay.tuesday.closes)
              : ''
            res.wednesdayOpening = res.openingTimes.byDay.wednesday.opens
              ? this.parseTimeToDate(res.openingTimes.byDay.wednesday.opens)
              : ''
            res.wednesdayClosing = res.openingTimes.byDay.wednesday.closes
              ? this.parseTimeToDate(res.openingTimes.byDay.wednesday.closes)
              : ''
            res.thursdayOpening = res.openingTimes.byDay.thursday.opens
              ? this.parseTimeToDate(res.openingTimes.byDay.thursday.opens)
              : ''
            res.thursdayClosing = res.openingTimes.byDay.thursday.closes
              ? this.parseTimeToDate(res.openingTimes.byDay.thursday.closes)
              : ''
            res.fridayOpening = res.openingTimes.byDay.friday.opens
              ? this.parseTimeToDate(res.openingTimes.byDay.friday.opens)
              : ''
            res.fridayClosing = res.openingTimes.byDay.friday.closes
              ? this.parseTimeToDate(res.openingTimes.byDay.friday.closes)
              : ''
            res.saturdayOpening = res.openingTimes.byDay.saturday.opens
              ? this.parseTimeToDate(res.openingTimes.byDay.saturday.opens)
              : ''
            res.saturdayClosing = res.openingTimes.byDay.saturday.closes
              ? this.parseTimeToDate(res.openingTimes.byDay.saturday.closes)
              : ''
            res.sundayOpening = res.openingTimes.byDay.sunday.opens
              ? this.parseTimeToDate(res.openingTimes.byDay.sunday.opens)
              : ''
            res.sundayClosing = res.openingTimes.byDay.sunday.closes
              ? this.parseTimeToDate(res.openingTimes.byDay.sunday.closes)
              : ''
            res.delivery.openingTimes.daily.openingTime = res.delivery.openingTimes.daily.opens
              ? this.parseTimeToDate(res.delivery.openingTimes.daily.opens)
              : ''
            res.delivery.openingTimes.daily.closingTime = res.delivery.openingTimes.daily.closes
              ? this.parseTimeToDate(res.delivery.openingTimes.daily.closes)
              : ''
            if (res.delivery.openingTimes.byDay) {
              res.delivery.openingTimes.byDay.mondayOpening = res.delivery.openingTimes.byDay.monday.opens
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.monday.opens)
                : ''
              res.delivery.openingTimes.byDay.mondayClosing = res.delivery.openingTimes.byDay.monday.closes
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.monday.closes)
                : ''
              res.delivery.openingTimes.byDay.tuesdayOpening = res.delivery.openingTimes.byDay.tuesday.opens
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.tuesday.opens)
                : ''
              res.delivery.openingTimes.byDay.tuesdayClosing = res.delivery.openingTimes.byDay.tuesday.closes
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.tuesday.closes)
                : ''
              res.delivery.openingTimes.byDay.wednesdayOpening = res.delivery.openingTimes.byDay.wednesday.opens
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.wednesday.opens)
                : ''
              res.delivery.openingTimes.byDay.wednesdayClosing = res.delivery.openingTimes.byDay.wednesday.closes
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.wednesday.closes)
                : ''
              res.delivery.openingTimes.byDay.thursdayOpening = res.delivery.openingTimes.byDay.thursday.opens
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.thursday.opens)
                : ''
              res.delivery.openingTimes.byDay.thursdayClosing = res.delivery.openingTimes.byDay.thursday.closes
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.thursday.closes)
                : ''
              res.delivery.openingTimes.byDay.fridayOpening = res.delivery.openingTimes.byDay.friday.opens
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.friday.opens)
                : ''
              res.delivery.openingTimes.byDay.fridayClosing = res.delivery.openingTimes.byDay.friday.closes
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.friday.closes)
                : ''
              res.delivery.openingTimes.byDay.saturdayOpening = res.delivery.openingTimes.byDay.saturday.opens
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.saturday.opens)
                : ''
              res.delivery.openingTimes.byDay.saturdayClosing = res.delivery.openingTimes.byDay.saturday.closes
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.saturday.closes)
                : ''
              res.delivery.openingTimes.byDay.sundayOpening = res.delivery.openingTimes.byDay.sunday.opens
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.sunday.opens)
                : ''
              res.delivery.openingTimes.byDay.sundayClosing = res.delivery.openingTimes.byDay.sunday.closes
                ? this.parseTimeToDate(res.delivery.openingTimes.byDay.sunday.closes)
                : ''
            } else {
              res.delivery.openingTimes.byDay = {
                enabled: false,
                monday: { opens: '', closes: '' },
                tuesday: { opens: '', closes: '' },
                wednesday: { opens: '', closes: '' },
                thursday: { opens: '', closes: '' },
                friday: { opens: '', closes: '' },
                saturday: { opens: '', closes: '' },
                sunday: { opens: '', closes: '' },
              }
            }
            res.takeaway.openingTimes.daily.opens = res.takeaway.openingTimes.daily.opens
              ? this.parseTimeToDate(res.takeaway.openingTimes.daily.opens)
              : ''
            res.takeaway.openingTimes.daily.closes = res.takeaway.openingTimes.daily.closes
              ? this.parseTimeToDate(res.takeaway.openingTimes.daily.closes)
              : ''
            if (res.takeaway.openingTimes.byDay) {
              res.takeaway.openingTimes.byDay.mondayOpening = res.takeaway.openingTimes.byDay.monday.opens
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.monday.opens)
                : ''
              res.takeaway.openingTimes.byDay.mondayClosing = res.takeaway.openingTimes.byDay.monday.closes
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.monday.closes)
                : ''
              res.takeaway.openingTimes.byDay.tuesdayOpening = res.takeaway.openingTimes.byDay.tuesday.opens
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.tuesday.opens)
                : ''
              res.takeaway.openingTimes.byDay.tuesdayClosing = res.takeaway.openingTimes.byDay.tuesday.closes
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.tuesday.closes)
                : ''
              res.takeaway.openingTimes.byDay.wednesdayOpening = res.takeaway.openingTimes.byDay.wednesday.opens
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.wednesday.opens)
                : ''
              res.takeaway.openingTimes.byDay.wednesdayClosing = res.takeaway.openingTimes.byDay.wednesday.closes
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.wednesday.closes)
                : ''
              res.takeaway.openingTimes.byDay.thursdayOpening = res.takeaway.openingTimes.byDay.thursday.opens
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.thursday.opens)
                : ''
              res.takeaway.openingTimes.byDay.thursdayClosing = res.takeaway.openingTimes.byDay.thursday.closes
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.thursday.closes)
                : ''
              res.takeaway.openingTimes.byDay.fridayOpening = res.takeaway.openingTimes.byDay.friday.opens
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.friday.opens)
                : ''
              res.takeaway.openingTimes.byDay.fridayClosing = res.takeaway.openingTimes.byDay.friday.closes
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.friday.closes)
                : ''
              res.takeaway.openingTimes.byDay.saturdayOpening = res.takeaway.openingTimes.byDay.saturday.opens
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.saturday.opens)
                : ''
              res.takeaway.openingTimes.byDay.saturdayClosing = res.takeaway.openingTimes.byDay.saturday.closes
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.saturday.closes)
                : ''
              res.takeaway.openingTimes.byDay.sundayOpening = res.takeaway.openingTimes.byDay.sunday.opens
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.sunday.opens)
                : ''
              res.takeaway.openingTimes.byDay.sundayClosing = res.takeaway.openingTimes.byDay.sunday.closes
                ? this.parseTimeToDate(res.takeaway.openingTimes.byDay.sunday.closes)
                : ''
            } else {
              res.takeaway.openingTimes.byDay = {
                enabled: false,
                monday: { opens: '', closes: '' },
                tuesday: { opens: '', closes: '' },
                wednesday: { opens: '', closes: '' },
                thursday: { opens: '', closes: '' },
                friday: { opens: '', closes: '' },
                saturday: { opens: '', closes: '' },
                sunday: { opens: '', closes: '' },
              }
            }
          }
          this.restaurantData = res
          this.loading = false
        } catch (error) {
          console.error('Error fetching restaurant details:', error)
          this.loading = false
        }
      }
    },
    createPayload() {
      const data = {
        name: this.restaurantData.name || '',
        assetIds: this.restaurantData.assetIds || [],
        description: this.restaurantData.description || '',
        slug: this.restaurantData.slug || '',
        type: this.restaurantData.type || _id,
        address: this.restaurantData.address || '',
        postcode: this.restaurantData.postcode || '',
        email: this.restaurantData.email || '',
        phone: this.restaurantData.phone || '',
        facebook: this.restaurantData.facebook || '',
        instagram: this.restaurantData.instagram || '',
        twitter: this.restaurantData.twitter || '',
        website: this.restaurantData.website || '',
        tripadvisor: this.restaurantData.tripadvisor || '',
        active: this.restaurantData.active || false,
        pos: this.restaurantData.pos || '',
        operatingMode: this.restaurantData.operatingMode,
        orderTimeLimit: this.restaurantData.orderTimeLimit,
        winmaxConfig: {
          ...this.restaurantData.winmaxConfig,
          terminal: this.restaurantData.winmaxConfig.terminal || null,
          serviceZoneId: this.restaurantData.winmaxConfig.serviceZoneId || null,
        },
        restusConfig: {
          operatingMode: this.restaurantData.operatingMode || '',
          orderTimeLimit: this.restaurantData.orderTimeLimit || null,
        },
        openingTimes: {
          selected: this.restaurantData.openingTimes.selected,
          daily: {
            opens: this.restaurantData.openingTime || '',
            closes: this.restaurantData.closingTime || '',
          },
          byDay: {
            monday: {
              opens: this.restaurantData.mondayOpening || '',
              closes: this.restaurantData.mondayClosing || '',
              closed: null,
            },
            tuesday: {
              opens: this.restaurantData.tuesdayOpening || '',
              closes: this.restaurantData.tuesdayClosing || '',
              closed: null,
            },
            wednesday: {
              opens: this.restaurantData.wednesdayOpening || '',
              closes: this.restaurantData.wednesdayClosing || '',
              closed: null,
            },
            thursday: {
              opens: this.restaurantData.thursdayOpening || '',
              closes: this.restaurantData.thursdayClosing || '',
              closed: null,
            },
            friday: {
              opens: this.restaurantData.fridayOpening || '',
              closes: this.restaurantData.fridayClosing || '',
              closed: null,
            },
            saturday: {
              opens: this.restaurantData.saturdayOpening || '',
              closes: this.restaurantData.saturdayClosing || '',
              closed: null,
            },
            sunday: {
              opens: this.restaurantData.sundayOpening || '',
              closes: this.restaurantData.sundayClosing || '',
              closed: null,
            },
          },
          is24h: this.restaurantData.openingTimes.selected === 'is24h' || false,
        },
        delivery: {
          enabled: this.restaurantData.delivery.enabled || this.restaurantData.delivery.enabled || false,

          sameAsDineIn: false,
          deliveryTime: null,
          openingTimes: {
            selected: this.restaurantData.delivery.openingTimes.selected,
            daily: {
              opens: this.restaurantData.delivery.openingTimes.daily.opens || '',
              closes: this.restaurantData.delivery.openingTimes.daily.closes || '',
            },
            byDay: {
              monday: {
                opens: this.restaurantData.delivery.openingTimes.byDay.monday.opens || '',
                closes: this.restaurantData.delivery.openingTimes.byDay.monday.closes || '',
                closed: null,
              },
              tuesday: {
                opens: this.restaurantData.delivery.openingTimes.byDay.tuesday.opens || '',
                closes: this.restaurantData.delivery.openingTimes.byDay.tuesday.closes || '',
                closed: null,
              },
              wednesday: {
                opens: this.restaurantData.delivery.openingTimes.byDay.wednesday.opens || '',
                closes: this.restaurantData.delivery.openingTimes.byDay.wednesday.closes || '',
                closed: null,
              },
              thursday: {
                opens: this.restaurantData.delivery.openingTimes.byDay.thursday.opens || '',
                closes: this.restaurantData.delivery.openingTimes.byDay.thursday.closes || '',
                closed: null,
              },
              friday: {
                opens: this.restaurantData.delivery.openingTimes.byDay.friday.opens || '',
                closes: this.restaurantData.delivery.openingTimes.byDay.friday.closes || '',
                closed: null,
              },
              saturday: {
                opens: this.restaurantData.delivery.openingTimes.byDay.saturday.opens || '',
                closes: this.restaurantData.delivery.openingTimes.byDay.saturday.closes || '',
                closed: null,
              },
              sunday: {
                opens: this.restaurantData.delivery.openingTimes.byDay.sunday.opens || '',
                closes: this.restaurantData.delivery.openingTimes.byDay.sunday.closes || '',
                closed: null,
              },
            },
            is24h: this.restaurantData.delivery.openingTimes.selected === 'is24h' || false,
            closingSoonMinutes: this.restaurantData.closingSoonMinutes,
          },
        },
        takeaway: {
          enabled: this.restaurantData.takeaway.enabled || this.restaurantData.takeaway.enabled || false,
          sameAsDineIn: false,
          pickupTime: null,
          openingTimes: {
            selected: this.restaurantData.takeaway.openingTimes.selected,
            daily: {
              opens: this.restaurantData.takeaway.openingTimes.daily.opens || '',
              closes: this.restaurantData.takeaway.openingTimes.daily.closes || '',
            },
            byDay: {
              monday: {
                opens: this.restaurantData.takeaway.openingTimes.byDay.monday.opens || '',
                closes: this.restaurantData.takeaway.openingTimes.byDay.monday.closes || '',
                closed: null,
              },
              tuesday: {
                opens: this.restaurantData.takeaway.openingTimes.byDay.tuesday.opens || '',
                closes: this.restaurantData.takeaway.openingTimes.byDay.tuesday.closes || '',
                closed: null,
              },
              wednesday: {
                opens: this.restaurantData.takeaway.openingTimes.byDay.wednesday.opens || '',
                closes: this.restaurantData.takeaway.openingTimes.byDay.wednesday.closes || '',
                closed: null,
              },
              thursday: {
                opens: this.restaurantData.takeaway.openingTimes.byDay.thursday.opens || '',
                closes: this.restaurantData.takeaway.openingTimes.byDay.thursday.closes || '',
                closed: null,
              },
              friday: {
                opens: this.restaurantData.takeaway.openingTimes.byDay.friday.opens || '',
                closes: this.restaurantData.takeaway.openingTimes.byDay.friday.closes || '',
                closed: null,
              },
              saturday: {
                opens: this.restaurantData.takeaway.openingTimes.byDay.saturday.opens || '',
                closes: this.restaurantData.takeaway.openingTimes.byDay.saturday.closes || '',
                closed: null,
              },
              sunday: {
                opens: this.restaurantData.takeaway.openingTimes.byDay.sunday.opens || '',
                closes: this.restaurantData.takeaway.openingTimes.byDay.sunday.closes || '',
                closed: null,
              },
            },
            is24h: this.restaurantData.takeaway.openingTimes.selected === 'is24h' || false,
            closingSoonMinutes: this.restaurantData.closingSoonMinutes,
          },
        },
        guestUsers: this.restaurantData.guestUsers || false,
        guestCheckout: this.restaurantData.guestCheckout || false,
        repeatLastOrder: this.restaurantData.repeatLastOrder || false,
        minimumCharge: this.restaurantData.minimumCharge || null,
        foodArticleNotes: this.restaurantData.foodArticleNotes || '',
        drinkArticleNotes: this.restaurantData.drinkArticleNotes || '',
        orderNotes: this.restaurantData.orderNotes || '',
        deliveryNotes: this.restaurantData.deliveryNotes || '',
        dineInConfirmationMessage: this.restaurantData.dineInConfirmationMessage || '',
        deliveryConfirmationMessage: this.restaurantData.deliveryConfirmationMessage || '',
        takeawayConfirmationMessage: this.restaurantData.takeawayConfirmationMessage || '',
        tabs: this.restaurantData.tabs || false,
        tips: this.restaurantData.tips || false,
        primaryColor: this.restaurantData.primaryColor,
        secondaryColor: this.restaurantData.secondaryColor,
        backgroundColor: this.restaurantData.backgroundColor,
        textColor: this.restaurantData.textColor,
        headerColor: this.restaurantData.headerColor,
        footerColor: this.restaurantData.footerColor,
        headerUrl: this.restaurantData.headerUrl,
        logoUrl: this.restaurantData.logoUrl,
        closingSoonMinutes: this.restaurantData.closingSoonMinutes || null,
        fontFamily: this.restaurantData.fontFamily || '',
        fontUrl: this.restaurantData.fontUrl || '',
        hideHeader: this.restaurantData.hideHeader || false,
        hideLogo: this.restaurantData.hideLogo || false,
        hideDetails: this.restaurantData.hideDetails || false,
      }
      return data
    },
    async createRestaurant() {
      if (this.$refs.form.validate()) {
        const data = removeNulls(this.createPayload())
        const url = import.meta.env.VITE_API_BASE_URL
        console.log(url)
        try {
          const response = await axios.post(`${url}/outlets`, data)
          this.restaurantData = response.data
          console.log('Restaurant details:', this.restaurantData)
          this.init({ message: "You've successfully created outlet", color: 'success' })
          this.isProgrammaticNavigation = true
          this.$router.push({ name: 'list' })
        } catch (error) {
          this.init({ message: error.response.data, color: 'danger' })
        }
      }
    },
    async updateRestaurant() {
      if (this.$refs.form.validate()) {
        const data = removeNulls(this.createPayload())
        const url = import.meta.env.VITE_API_BASE_URL
        delete data.name

        const response = await axios.patch(`${url}/outlets/${this.restaurantId}`, data)

        if (response.status === 200) {
          this.init({ message: "You've successfully updated outlet", color: 'success' })
          if (this.$route.name === 'admin-update-outlet') {
            this.$router.push({ name: 'list' })
          }
        } else {
          this.init({ message: response.data, color: 'danger' })
        }
      }
    },
  },
}
</script>
<style scoped>
.config {
  --va-switch-label-left-padding: 0.8rem;
}
.day {
  font-size: 12px;
}
.red {
  color: #e42222;
  font-size: 13px;
}
</style>
