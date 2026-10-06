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
                id="brevoSenderEmail"
                v-model="restaurantData.brevoSenderEmail"
                label="Brevo Sender Email"
                name="brevoSenderEmail"
                type="email"
              />
              <VaInput
                id="brevoSenderName"
                v-model="restaurantData.brevoSenderName"
                label="Brevo Sender Name"
                name="brevoSenderName"
              />
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4">
              <div class="col-span-1">
                <VaSelect
                  v-model="restaurantData.supportedLanguages"
                  label="Supported Languages"
                  :options="languages"
                  multiple
                  track-by="value"
                  value-by="value"
                  searchable
                  clearable
                />
              </div>
              <div class="col-span-1">
                <VaSelect
                  v-model="restaurantData.defaultLanguage"
                  label="Default Language"
                  :options="filteredLanguages"
                  track-by="value"
                  value-by="value"
                  :rules="[(v) => !!v || 'Default language is required']"
                />
              </div>
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
                  autocomplete="new-password"
                />
                <VaInput
                  v-model="restaurantData.winmaxConfig.terminal"
                  name="Terminal"
                  label="Terminal"
                  placeholder="Terminal"
                  type="number"
                />
              </div>
              <div v-if="restaurantData.pos == 'winmax'" class="w-full mt-4">
                <VaInput
                  v-model="restaurantData.winmaxConfig.failureAlertPhonesRaw"
                  label="Winmax Failure Alert Phones"
                  name="failureAlertPhones"
                  placeholder="e.g. 35799111111, 35799222222"
                  helper-text="Comma-separated phone numbers in international format. An SMS is sent to these numbers when an order fails to reach Winmax, and when an online order is rejected by or fails to reach the POS (Novasero)."
                />
              </div>
              <div v-if="restaurantData.pos == 'winmax'" class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4">
                <VaSelect
                  v-model="restaurantData.posSalesMode"
                  label="Winmax Sales Mode"
                  :options="posSalesModes"
                  :track-by="(option) => option.value"
                  :value-by="(option) => option.value"
                  helper-text="Table orders: every order gets a POS table and is sent as kitchen requests (restaurants, default). Sales documents: each paid order is posted as one closed sales document — no tables (retail POS handhelds)."
                />
                <VaInput
                  v-if="restaurantData.posSalesMode === 'document'"
                  v-model="restaurantData.posSaleDocumentTypeCode"
                  label="Default Sales Document Type"
                  name="posSaleDocumentTypeCode"
                  placeholder="e.g. IR"
                  helper-text="Winmax document type code used for sales (Invoice/Receipt). A delivery zone (shop) can override it with its own type."
                />
              </div>
              <!-- Pre-order dispatch: when a paid order for later (orderFor
                   "future") is sent to Winmax. "Before pickup" is the historical
                   rule (pickup time minus the delivery zone's lead time); the
                   other sends today's pre-orders at once, like a normal order
                   (the ticket keeps its FUTURE line and pickup time), and a later
                   day's at this outlet's opening time on that day (Opening Times,
                   Cyprus time). Top-level outlet field sent only when changed:
                   absent = before pickup, so an outlet left alone never gets the
                   key. Changing it also moves the pre-orders already waiting. -->
              <div v-if="restaurantData.pos == 'winmax'" class="w-full mt-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                  <VaSelect
                    v-model="restaurantData.futureOrderDispatch"
                    label="Send pre-orders to Winmax"
                    :options="futureOrderDispatchModes"
                    :track-by="(option) => option.value"
                    :value-by="(option) => option.value"
                  />
                </div>
                <div class="va-text-secondary text-xs mt-1">
                  Before pickup: a pre-order reaches the kitchen the zone's lead time before its pickup time (as today).
                  Same day / later days: a pre-order for today is sent the moment it is paid, like a normal order, with
                  its FUTURE line and pickup time on the ticket; one for a later day is sent at this outlet's opening
                  time on that day (Opening Times, Cyprus time; a day without hours uses the lead time). Switching moves
                  the pre-orders already waiting to the new times.
                </div>
              </div>
              <!-- Skip tables still in use: before the zone counter hands a paid
                   order its table number, the backend passes over the numbers of
                   its own orders that have not reached the kitchen yet and the
                   tables open at the till right now (one read of this outlet's
                   Winmax database, so that half needs the Winmax Database field
                   below). For a zone with few tables and many orders a day, where
                   a number comes round again while its table is still open.
                   Top-level outlet field sent only when changed: absent = off, so
                   an outlet left alone never gets the key and its counter runs
                   exactly as before. -->
              <div v-if="restaurantData.pos == 'winmax'" class="w-full mt-4">
                <VaSwitch
                  v-model="restaurantData.skipTablesInUse"
                  label="Table numbers: skip tables still in use"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
                <!-- A hint, not a save guard: without a database the backend may
                     read, the Stella half still works, and the field may be
                     filled later. -->
                <div v-if="skipTablesInUseHint" class="text-danger text-xs mt-1">
                  {{ skipTablesInUseHint }}
                </div>
                <div class="va-text-secondary text-xs mt-1">
                  Before a table number is handed out, Stella passes over the numbers of its own orders that have not
                  reached the kitchen yet and the tables open at the till right now (read from this outlet's Winmax
                  database — needs the Winmax Database field below). For a zone with few tables and many orders a day,
                  where a number comes round again while its table is still open.
                </div>
                <!-- The same outlet field as "Winmax Database" in the stock and
                     retail loyalty cards below (one database per outlet). Shown
                     here only while neither of those cards is on screen, so the
                     field the hints point at is always somewhere on the page and
                     never twice; its own `name` like theirs. -->
                <div
                  v-if="
                    restaurantData.skipTablesInUse &&
                    !restaurantData.winmaxStockSync &&
                    !restaurantData.winmaxRetailLoyalty
                  "
                  class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4"
                >
                  <VaInput
                    v-model="restaurantData.winmaxSqlDatabase"
                    label="Winmax Database"
                    name="winmaxSkipTablesSqlDatabase"
                    class="w-full"
                    :placeholder="`e.g. ${winmaxStockExpectedDatabase || 'Winmax4_Test'}`"
                    messages="This outlet's own database on the Winmax SQL server: Winmax4_ followed by the Company above. Stella reads the tables open at the till from it."
                  />
                </div>
              </div>
              <div
                v-if="restaurantData.pos == 'winmax' && restaurantData.posSalesMode === 'document'"
                class="w-full mt-4"
              >
                <VaSwitch
                  v-model="restaurantData.posQuickMenuOffers"
                  label="POS quick-menu offers"
                  left-label
                  size="small"
                />
                <div class="va-text-secondary text-xs mt-1">
                  Show the Offers quick menu in the Stella POS app. Offers act as browsing shortcuts: their items are
                  sold as normal articles at catalogue prices (offer price stays 0).
                </div>
              </div>
              <!-- Stella POS receipt: printed by the handheld itself right after
                   payment (no Winmax read-back). Header can be pulled from the
                   Winmax service zone's DocumentsHeader with the sync button. -->
              <div
                v-if="restaurantData.pos == 'winmax' && restaurantData.posSalesMode === 'document'"
                class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4"
              >
                <div class="w-full">
                  <VaTextarea
                    v-model="restaurantData.posReceiptHeader"
                    label="POS receipt header"
                    name="posReceiptHeader"
                    :min-rows="3"
                    :max-rows="6"
                    class="w-full"
                    placeholder="Legal name&#10;Address&#10;VAT number"
                  />
                  <div class="flex items-center gap-3 mt-2">
                    <VaButton
                      preset="secondary"
                      size="small"
                      icon="sync"
                      :loading="syncingReceiptHeader"
                      :disabled="!restaurantId"
                      @click="syncReceiptHeaderFromWinmax"
                    >
                      Sync from Winmax
                    </VaButton>
                    <span class="va-text-secondary text-xs">
                      Printed centred at the top of the receipt, one line per row. Sync reads the Winmax service zone
                      matching the saved sales document type{{ restaurantId ? '' : ' (save the outlet first)' }}.
                    </span>
                  </div>
                </div>
                <div class="w-full">
                  <VaTextarea
                    v-model="restaurantData.posReceiptFooter"
                    label="POS receipt footer"
                    name="posReceiptFooter"
                    :min-rows="2"
                    :max-rows="4"
                    class="w-full"
                    placeholder="Website, returns policy…"
                  />
                  <VaInput
                    v-model="restaurantData.posReceiptVatPercent"
                    label="POS receipt VAT %"
                    name="posReceiptVatPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="19"
                    class="w-full mt-3"
                    helper-text="Prints Net / VAT lines at this rate; leave empty to print none."
                  />
                </div>
              </div>

              <!-- Winmax retail loyalty: hourly sweep of the outlet's own Winmax
                   database (till sales earn points) + points mirrored to the
                   entity's current account as credit/redeem documents. All
                   top-level outlet fields (winmaxConfig is replaced wholesale on
                   save). Off = the outlet is untouched. -->
              <div v-if="restaurantData.pos == 'winmax'" class="w-full mt-6">
                <VaSwitch
                  v-model="restaurantData.winmaxRetailLoyalty"
                  label="Winmax retail loyalty"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
                <div class="va-text-secondary text-xs mt-1">
                  Every hour, read paid sales rung on the Winmax tills from this outlet's Winmax database, award loyalty
                  points to the matching Stella customers (entity code = customer code) and mirror the points to the
                  entity's current account as credit. The earn rate itself is set under Loyalty → Settings.
                </div>
              </div>
              <!-- Use Winmax for stock: with this on, a stock number typed on the
                   Articles page (the article's quantity in the stock zone) is sent to
                   Winmax as a manufacturing document (M+ / M-) for the difference —
                   the article must be a composition set to Fabrication — and every
                   minute the backend reads the Winmax warehouse stock from the
                   outlet's own Winmax database and Stella's counter follows it. On
                   needs a warehouse code, a stock zone and that database's name
                   (winmaxSqlDatabase, the field the retail loyalty card below edits
                   too): the save is refused without them. Top-level outlet fields
                   (winmaxConfig is replaced wholesale on save); the last-sync fields
                   are written by the backend only. Off = the outlet is untouched. -->
              <div v-if="restaurantData.pos == 'winmax'" class="w-full mt-6">
                <VaSwitch
                  v-model="restaurantData.winmaxStockSync"
                  label="Use Winmax for stock"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
                <div v-if="winmaxStockSyncHint" class="text-danger text-xs mt-1">
                  {{ winmaxStockSyncHint }}
                </div>
                <div class="va-text-secondary text-xs mt-1">
                  Stock numbers typed on the Articles page are sent to Winmax (the item must be a composition set to
                  Fabrication) and Stella follows Winmax's stock every minute.
                </div>
              </div>
              <!-- The hints here use `messages` (shown under the field): `helper-text`
                   is not a Vuestic prop, so its text never reaches the screen. -->
              <div
                v-if="restaurantData.pos == 'winmax' && restaurantData.winmaxStockSync"
                class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4"
              >
                <VaInput
                  v-model="restaurantData.winmaxStockWarehouseCode"
                  label="Winmax Warehouse Code"
                  name="winmaxStockWarehouseCode"
                  type="number"
                  placeholder="e.g. 1"
                  required-mark
                  messages="The Winmax warehouse whose stock this outlet sells from (the service zone's warehouse in Winmax). Required."
                />
                <VaSelect
                  v-model="restaurantData.winmaxStockZoneId"
                  label="Stock Zone"
                  :options="stockZoneOptions"
                  :track-by="(option) => option.value"
                  :value-by="(option) => option.value"
                  placeholder="Choose the delivery zone"
                  required-mark
                  messages="The Stella delivery zone whose stock column mirrors that warehouse (e.g. Online). Required."
                />
                <!-- The same outlet field as "Winmax Database" under Winmax retail
                     loyalty (one database per outlet); its own `name` here because
                     both inputs are on screen when both switches are on. -->
                <div class="w-full">
                  <VaInput
                    v-model="restaurantData.winmaxSqlDatabase"
                    label="Winmax Database"
                    name="winmaxStockSqlDatabase"
                    class="w-full"
                    :placeholder="`e.g. ${winmaxStockExpectedDatabase || 'Winmax4_Test'}`"
                    required-mark
                    messages="This outlet's own database on the Winmax SQL server: Winmax4_ followed by the Company above. Stella reads the stock from it. Required."
                  />
                  <div v-if="winmaxStockDatabaseWarning" class="text-danger text-xs mt-1">
                    {{ winmaxStockDatabaseWarning }}
                  </div>
                </div>
                <div class="va-text-secondary text-xs md:col-span-2">
                  Last sync: {{ winmaxStockLastSyncText }}
                  <span v-if="restaurantData.winmaxStockLastSyncError" class="text-danger">
                    — {{ restaurantData.winmaxStockLastSyncError }}
                  </span>
                </div>
              </div>
              <div
                v-if="restaurantData.pos == 'winmax' && restaurantData.winmaxRetailLoyalty"
                class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4"
              >
                <VaInput
                  v-model="restaurantData.winmaxSqlDatabase"
                  label="Winmax Database"
                  name="winmaxSqlDatabase"
                  placeholder="e.g. Winmax4_Test"
                  helper-text="This outlet's own database on the Winmax SQL server (letters, digits, underscore)."
                />
                <VaInput
                  v-model="restaurantData.winmaxRetailLoyaltyDocTypesRaw"
                  label="Sale Document Types"
                  name="winmaxRetailLoyaltyDocTypes"
                  placeholder="e.g. IR, IRE"
                  helper-text="Comma-separated Winmax document type codes that count as till sales (each branch has its own Invoice/Receipt type)."
                />
                <VaInput
                  v-model="restaurantData.winmaxRetailLoyaltyExcludeTerminalsRaw"
                  label="Exclude Terminals"
                  name="winmaxRetailLoyaltyExcludeTerminals"
                  placeholder="e.g. 2089"
                  helper-text="Comma-separated Winmax terminal codes whose documents are ignored: the terminal(s) Stella sends orders on, so a Stella order pulled back from Winmax never earns twice."
                />
                <VaInput
                  v-model="restaurantData.winmaxRetailLoyaltyPaymentTypeId"
                  label="Current-account Payment Type ID"
                  name="winmaxRetailLoyaltyPaymentTypeId"
                  type="number"
                  placeholder="e.g. 4"
                  helper-text="The Winmax payment type customers use to pay with their credit (e.g. 'Credit'). Amounts paid with it don't earn points. 0 = none."
                />
                <VaInput
                  v-model="restaurantData.winmaxRetailLoyaltyCreditDocType"
                  label="Credit Document Type"
                  name="winmaxRetailLoyaltyCreditDocType"
                  placeholder="e.g. CN"
                  helper-text="Document type posted for every earn (a credit note with one line and no payment). Empty = points are not mirrored to Winmax."
                />
                <VaInput
                  v-model="restaurantData.winmaxRetailLoyaltyCreditArticleCode"
                  label="Credit Article"
                  name="winmaxRetailLoyaltyCreditArticleCode"
                  placeholder="e.g. POINTS"
                  helper-text="The article on the credit note's single line. Must be tax-exempt (0% VAT) or Winmax adds VAT on top of the points' value."
                />
                <VaInput
                  v-model="restaurantData.winmaxRetailLoyaltyRedeemDocType"
                  label="Redeem Document Type"
                  name="winmaxRetailLoyaltyRedeemDocType"
                  placeholder="e.g. DBN"
                  helper-text="Document type posted when points are redeemed in Stella, and the type the tills use to redeem — the sweep books those in Stella."
                />
                <VaInput
                  v-model="restaurantData.winmaxRetailLoyaltyRedeemArticleCode"
                  label="Redeem Article"
                  name="winmaxRetailLoyaltyRedeemArticleCode"
                  placeholder="e.g. REDEEM"
                  helper-text="The article on the redeem document's single line. Tax-exempt as well."
                />
                <VaInput
                  v-model="restaurantData.winmaxRetailLoyaltyPointsPerCreditEuro"
                  label="Points per €1 of Credit"
                  name="winmaxRetailLoyaltyPointsPerCreditEuro"
                  type="number"
                  placeholder="50"
                  helper-text="Value of the points on the Winmax entity: 50 = 50 points are €1 of credit. Keep equal to the website's redemption rate."
                />
              </div>
              <!-- Daily stock reset: every morning at the set time (Cyprus time) the
                   backend puts each article's per-zone quantity back to the last
                   number entered in the Articles page stock column, minus the
                   pre-orders already placed for that day; a zone never given a
                   number keeps its stock as it is. Top-level outlet fields, sent
                   only when changed; the last-reset fields are written by the
                   backend only (switched on, or the time changed, after today's
                   reset time: the backend marks today done, so the first reset
                   is the next morning). Off = the outlet is untouched. -->
              <div class="w-full mt-6">
                <VaSwitch
                  v-model="restaurantData.stockDailyReset"
                  label="Daily stock reset"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
                <div class="va-text-secondary text-xs mt-1">
                  Each morning every item goes back to the last stock number you entered, minus the pre-orders for that
                  day.
                </div>
              </div>
              <div v-if="restaurantData.stockDailyReset" class="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4">
                <VaInput
                  v-model="restaurantData.stockDailyResetTime"
                  label="Reset Time"
                  name="stockDailyResetTime"
                  placeholder="05:00"
                  :rules="[stockDailyResetTimeRule]"
                  helper-text="Cyprus time, 24-hour HH:mm, before the first orders of the day (e.g. 05:00). Switched on or changed after today's time, the first reset is tomorrow."
                />
                <div class="va-text-secondary text-xs self-end pb-2">
                  Last reset: {{ stockDailyResetSummary }}
                  <span v-if="stockDailyResetErrorCount" class="text-danger" :title="stockDailyResetErrorText">
                    — {{ stockDailyResetErrorCount }} error{{ stockDailyResetErrorCount === 1 ? '' : 's' }}
                  </span>
                </div>
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

            <!-- Public holidays + "refuse orders out of hours" (outlet level, all Cyprus
                 time). A listed date = closed all day, whatever the Opening Times say;
                 the list is pre-filled from the backend's Cyprus calendar and freely
                 editable. Rows without a valid date are flagged and never sent. Both
                 are top-level outlet fields sent only when changed, so every other
                 outlet's save payload is exactly as before. The switch makes the
                 server refuse online orders outside the Opening Times and on the
                 listed dates (GOC); off = no server check. -->
            <div class="w-full">
              <div class="font-bold mb-1">Public holidays (closed all day):</div>
              <div class="va-text-secondary text-xs mb-3">
                Cyprus dates. On a listed date the outlet is closed all day, whatever the Opening Times above say.
              </div>
              <div
                v-if="publicHolidayRows.length"
                class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2"
              >
                <div v-for="(holiday, index) in publicHolidayRows" :key="holiday._key || index">
                  <div class="flex items-center gap-2">
                    <input
                      v-model="holiday.date"
                      type="date"
                      aria-label="Date"
                      class="border border-1 h-8 w-[150px] shrink-0 px-2 rounded"
                      @blur="sortPublicHolidays"
                    />
                    <!-- 80 = the backend's HOLIDAY_NAME_MAX: a longer name is a 400 that blocks the whole save. -->
                    <input
                      v-model="holiday.name"
                      type="text"
                      aria-label="Name"
                      placeholder="Name, e.g. Christmas Day"
                      maxlength="80"
                      class="border border-1 h-8 flex-1 min-w-0 px-2 rounded"
                    />
                    <VaButton
                      preset="primary"
                      size="small"
                      color="danger"
                      icon="mso-delete"
                      aria-label="Remove date"
                      title="Remove date"
                      @click="removePublicHoliday(holiday)"
                    />
                  </div>
                  <div v-if="publicHolidayProblems[index]" class="text-danger text-xs mt-1">
                    {{ publicHolidayProblems[index] }}
                  </div>
                </div>
              </div>
              <div v-else class="va-text-secondary text-xs">No dates listed.</div>
              <div class="flex flex-wrap items-center gap-3 mt-3">
                <VaButton preset="secondary" size="small" icon="mso-add" @click="addPublicHoliday">Add date</VaButton>
                <VaButton
                  preset="secondary"
                  size="small"
                  icon="mso-event"
                  :loading="fillingPublicHolidays"
                  @click="fillCyprusPublicHolidays"
                >
                  Fill Cyprus public holidays {{ publicHolidayFillYears.from }}–{{ publicHolidayFillYears.to }}
                </VaButton>
              </div>
              <div class="mt-6">
                <!-- Without usable Opening Times the server restricts nothing, so "on"
                     would accept orders 24/7: the switch cannot be turned on then, but
                     one already on stays clickable so it can be switched off (the save
                     is blocked while it is on without hours). -->
                <VaSwitch
                  v-model="restaurantData.enforceOpeningTimes"
                  label="Refuse online orders outside these hours and on public holidays"
                  left-label
                  size="small"
                  :disabled="!restaurantData.enforceOpeningTimes && !!enforceOpeningTimesProblem"
                />
                <div
                  v-if="enforceOpeningTimesHint"
                  class="text-xs mt-1"
                  :class="restaurantData.enforceOpeningTimes ? 'text-danger' : 'va-text-secondary'"
                >
                  {{ enforceOpeningTimesHint }}
                </div>
                <div class="va-text-secondary text-xs mt-1">
                  On: the server refuses online orders outside the Opening Times above and on the listed dates (Cyprus
                  time). Off: orders are not checked.
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

            <!-- Switch labels must never wrap: VaSwitch gives the label a fixed
                 line box, so a wrapped second line paints over the first. The
                 long "Use Kiosk Wallee Terminals" label also gets a 2-column
                 cell so it fits on the row's second line. -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 lg:grid-cols-5 gap-4 w-full mt-4">
              <div class="w-full">
                <VaSwitch
                  v-model="restaurantData.guestUsers"
                  :true-value="true"
                  label="Guest Users"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
              </div>

              <div class="w-full">
                <VaSwitch
                  v-model="restaurantData.guestCheckout"
                  :true-value="true"
                  label="Guest Checkout"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
              </div>

              <div class="w-full">
                <VaSwitch
                  v-model="restaurantData.repeatLastOrder"
                  :true-value="true"
                  label="Repeat Last Order"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
              </div>

              <div class="w-full">
                <VaSwitch
                  v-model="restaurantData.tabs"
                  :true-value="true"
                  label="Tabs"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
              </div>

              <div class="w-full">
                <VaSwitch
                  v-model="restaurantData.tips"
                  :true-value="true"
                  label="Tips"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
              </div>

              <div class="w-full sm:col-span-2 md:col-span-2">
                <VaSwitch
                  v-model="restaurantData.useKioskWalleeTerminals"
                  :true-value="true"
                  label="Use Kiosk Wallee Terminals"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
              </div>
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <h1 class="mb-3 mt-6 font-bold text-lg">Design</h1>
      <VaCard>
        <VaCardContent>
          <div class="flex-col justify-start items-start gap-4 inline-flex w-full">
            <div class="flex gap-8 flex-col sm:flex-row sm:flex-wrap sm:items-center w-full">
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
              <!-- Same VaSwitch label-squeeze as the Options row: never let the
                   labels shrink, and let the trio wrap under the colour inputs
                   instead of being crushed at the end of the row. -->
              <div class="flex flex-wrap items-center gap-4 shrink-0">
                <VaSwitch
                  v-model="restaurantData.hideHeader"
                  :true-value="true"
                  label="Hide Header"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
                <VaSwitch
                  v-model="restaurantData.hideLogo"
                  :true-value="true"
                  label="Hide Logo"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
                <VaSwitch
                  v-model="restaurantData.hideDetails"
                  :true-value="true"
                  label="Hide Outlet details"
                  left-label
                  size="small"
                  class="whitespace-nowrap"
                />
              </div>
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

      <!-- Email Settings -->
      <VaCard class="mt-6">
        <VaCardContent>
          <h2 class="font-bold text-base mb-4">Email Settings</h2>

          <!-- Basic settings -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <VaInput v-model="restaurantData.emailSettings.replyTo" label="Reply-To Email" type="email" />
            <VaInput v-model="restaurantData.emailSettings.supportEmail" label="Support Email" type="email" />
            <VaInput v-model="restaurantData.emailSettings.supportPhone" label="Support Phone" />
            <VaInput v-model="restaurantData.emailSettings.websiteUrl" label="Website URL" type="url" />
            <div class="col-span-2 md:col-span-4">
              <VaInput v-model="restaurantData.emailSettings.logoUrl" label="Logo URL" type="url" class="w-full" />
            </div>
            <div class="col-span-2 md:col-span-4">
              <VaTextarea
                v-model="restaurantData.emailSettings.legalFooterHtml"
                label="Legal Footer HTML"
                :min-rows="2"
                :max-rows="4"
                class="w-full"
              />
            </div>
          </div>

          <!-- Templates -->
          <h3 class="font-semibold text-sm mt-6 mb-3 text-gray-600 uppercase tracking-wide">Email Templates</h3>

          <!-- Helper to show variable chips -->
          <template v-for="tpl in emailTemplates" :key="tpl.key">
            <div class="border rounded-lg p-4 mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="font-semibold text-sm">{{ tpl.label }}</span>
                <VaButton v-if="tpl.plainText" preset="secondary" size="small" @click="applyStandardText(tpl)">
                  Use standard text
                </VaButton>
                <div v-else class="flex flex-wrap gap-1">
                  <VaBadge
                    v-for="v in tpl.vars"
                    :key="v"
                    :text="v"
                    color="info"
                    class="text-xs cursor-pointer select-none"
                    title="Click to insert variable"
                    @click="insertVar(tpl.key, v)"
                  />
                </div>
              </div>
              <p v-if="tpl.note" class="text-xs text-gray-500 mb-2">{{ tpl.note }}</p>
              <!-- Office emails: written as plain text, like a normal email.
                   The backend turns it into the branded email (paragraphs,
                   line breaks, **bold**). -->
              <div v-if="tpl.plainText" class="grid grid-cols-1 gap-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span class="text-xs text-gray-500 mr-1">Insert:</span>
                  <VaBadge
                    v-for="v in tpl.vars"
                    :key="v"
                    :text="placeholderLabels[v] || v"
                    color="info"
                    class="placeholder-chip cursor-pointer select-none"
                    :title="v"
                    @click="insertPlaceholder(tpl.key, v)"
                  />
                </div>
                <div @focusin="tplLastField[tpl.key] = 'subject'">
                  <VaInput
                    :ref="'subject-' + tpl.key"
                    v-model="restaurantData.emailSettings.templates[tpl.key].subject"
                    label="Subject"
                    :placeholder="tpl.subjectPlaceholder"
                  />
                </div>
                <div @focusin="tplLastField[tpl.key] = 'text'">
                  <VaTextarea
                    :ref="'message-' + tpl.key"
                    v-model="restaurantData.emailSettings.templates[tpl.key].text"
                    label="Message"
                    :placeholder="tpl.standardText"
                    autosize
                    :min-rows="12"
                    :max-rows="30"
                    class="w-full"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    The grey text is only a preview of the standard message, which is sent while this box is empty. To
                    change it, click "Use standard text" and edit it, or write your own: press Enter for a new line,
                    leave an empty line between paragraphs, and use **double asterisks** for bold.
                  </p>
                  <p
                    v-if="
                      !(restaurantData.emailSettings.templates[tpl.key].text || '').trim() &&
                      (restaurantData.emailSettings.templates[tpl.key].html || '').trim()
                    "
                    class="text-xs text-warning mt-1"
                  >
                    This email still has an older HTML version saved, and that is what's sent while the message is
                    empty. Type a message (or use the standard text) to replace it, or
                    <button type="button" class="underline font-semibold" @click="removeOldHtml(tpl.key)">
                      remove the old HTML version
                    </button>
                    to send the built-in email.
                  </p>
                </div>
              </div>
              <div v-else class="grid grid-cols-1 gap-3">
                <VaInput
                  v-model="restaurantData.emailSettings.templates[tpl.key].subject"
                  :label="'Subject'"
                  :placeholder="tpl.subjectPlaceholder"
                />
                <div class="relative w-full">
                  <label
                    class="va-input-label va-input-wrapper__label va-input-wrapper__label--outer"
                    style="color: var(--va-primary)"
                  >
                    HTML Body
                    <span class="ml-1 text-gray-400 font-normal normal-case text-xs"
                      >(outer &lt;div&gt; added automatically)</span
                    >
                  </label>
                  <textarea
                    :ref="'htmlarea-' + tpl.key"
                    v-model="restaurantData.emailSettings.templates[tpl.key].html"
                    :placeholder="tpl.htmlPlaceholder"
                    rows="5"
                    class="w-full mt-1 p-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
                  />
                </div>
                <VaInput
                  v-if="tpl.hasToOverride"
                  v-model="restaurantData.emailSettings.templates[tpl.key]._toOverrideRaw"
                  label="To Override (comma-separated emails)"
                  placeholder="admin@example.com, ops@example.com"
                />
              </div>
            </div>
          </template>
        </VaCardContent>
      </VaCard>

      <!-- SMS / OTP Settings -->
      <VaCard class="mt-6">
        <VaCardContent>
          <h2 class="font-bold text-base mb-4">SMS / OTP Settings</h2>

          <div class="flex flex-col w-full">
            <VaSwitch
              v-model="restaurantData.smsSettings.enabled"
              label="Use this outlet's own SMS account"
              left-label
              size="small"
            />
            <div class="text-sm mt-2 opacity-70">
              When off, verification codes are sent using the platform's default SMS account.
            </div>

            <div v-if="restaurantData.smsSettings.enabled" class="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-4">
              <VaInput
                v-model="restaurantData.smsSettings.username"
                label="SMS Username"
                name="smsUsername"
                placeholder="Username"
                autocomplete="off"
                :rules="[validators.required]"
              />
              <!-- autocomplete="new-password" is required: without it the
                   browser silently overwrites this field with the admin's own
                   saved login password, and the wrong value gets saved. -->
              <VaInput
                v-model="restaurantData.smsSettings.password"
                label="SMS Password"
                name="smsPassword"
                placeholder="Password"
                type="password"
                autocomplete="new-password"
                :rules="[validators.required]"
              />
              <VaInput
                v-model="restaurantData.smsSettings.senderId"
                label="Sender ID"
                name="smsSenderId"
                placeholder="e.g. CLIENTB"
                helper-text="Shown as the SMS sender. Max 11 characters."
                :rules="[validators.required]"
              />
              <VaInput
                v-model="restaurantData.smsSettings.baseUrl"
                label="Gateway URL"
                name="smsBaseUrl"
                placeholder="Leave blank for the default"
                helper-text="Optional. Leave blank to use the default InstantSMS host."
              />
            </div>

            <div v-if="restaurantData.smsSettings.enabled" class="w-full mt-4">
              <VaInput
                v-model="restaurantData.smsSettings.otpTemplate"
                label="OTP Message Template"
                name="smsOtpTemplate"
                placeholder="Your {{ '{{brand}}' }} code is {{ '{{otp}}' }}"
                helper-text="Optional. Use {{ '{{otp}}' }} for the code and {{ '{{brand}}' }} for the outlet name. Leave blank for the default wording."
                class="w-full"
              />
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Captcha (Cloudflare Turnstile) Settings -->
      <VaCard class="mt-6">
        <VaCardContent>
          <h2 class="font-bold text-base mb-4">Captcha (Cloudflare Turnstile) Settings</h2>

          <div class="flex flex-col w-full">
            <VaSwitch
              v-model="restaurantData.turnstileSettings.enabled"
              label="Use this outlet's own Turnstile widget"
              left-label
              size="small"
            />
            <div class="text-sm mt-2 opacity-70">
              When off, OTP captcha tokens are verified against the platform's default Turnstile widget. The site key
              here must match the one built into this outlet's website.
            </div>

            <div
              v-if="restaurantData.turnstileSettings.enabled"
              class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4"
            >
              <VaInput
                v-model="restaurantData.turnstileSettings.siteKey"
                label="Turnstile Site Key"
                name="turnstileSiteKey"
                placeholder="0x4AAAAAA..."
                autocomplete="off"
                helper-text="Public key — for reference; the website bundle carries its own copy."
                :rules="[validators.required]"
              />
              <!-- autocomplete="new-password" is required: without it the
                   browser silently overwrites this field with the admin's own
                   saved login password, and the wrong value gets saved. -->
              <VaInput
                v-model="restaurantData.turnstileSettings.secretKey"
                label="Turnstile Secret Key"
                name="turnstileSecretKey"
                placeholder="Secret key"
                type="password"
                autocomplete="new-password"
                helper-text="From the same widget as the site key (Cloudflare dashboard → Turnstile)."
                :rules="[validators.required]"
              />
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Loyalty Settings -->
      <VaCard class="mt-6">
        <VaCardContent>
          <h2 class="font-bold text-base mb-4">Loyalty Settings</h2>

          <div class="flex flex-col w-full">
            <VaSwitch
              v-model="restaurantData.loyaltySettings.enabled"
              label="Enable loyalty program for this outlet"
              left-label
              size="small"
            />
            <div class="text-sm mt-2 opacity-70">
              When on, registered customers earn points on their orders — either as soon as the order is sent to the
              POS, or when the delivery system confirms delivery.
            </div>

            <div
              v-if="restaurantData.loyaltySettings.enabled"
              class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full mt-4"
            >
              <VaInput
                v-model="restaurantData.loyaltySettings.pointsPerEuro"
                label="Points per €"
                name="loyaltyPointsPerEuro"
                type="number"
                min="0"
                step="0.5"
              />
              <VaSelect
                v-model="restaurantData.loyaltySettings.allocationTrigger"
                label="Points Allocation"
                :options="loyaltyTriggerOptions"
                value-by="value"
                text-by="text"
              />
              <VaInput
                v-model="restaurantData.loyaltySettings.welcomePoints"
                label="Welcome Points"
                name="loyaltyWelcomePoints"
                type="number"
                min="0"
                step="1"
                helper-text="One-time bonus granted on registration."
              />
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Customer app (loyalty app): e-mail rule, new products, announcements, push.
           customerSettings / pushSettings — sent on save only when changed. -->
      <VaCard class="mt-6">
        <VaCardContent>
          <h2 class="font-bold text-base mb-4">{{ t('outletForm.customerApp.title') }}</h2>
          <div class="text-sm mb-4 opacity-70">{{ t('outletForm.customerApp.intro') }}</div>

          <div class="flex flex-col w-full gap-6">
            <div class="flex flex-col">
              <VaSwitch
                v-model="restaurantData.customerSettings.requireEmail"
                :label="t('outletForm.customerApp.requireEmail')"
                left-label
                size="small"
              />
              <div class="text-sm mt-2 opacity-70">{{ t('outletForm.customerApp.requireEmailHelp') }}</div>
            </div>

            <div class="flex flex-col">
              <VaSelect
                v-model="restaurantData.customerSettings.newProductsCategoryId"
                :label="t('outletForm.customerApp.newProductsCategory')"
                :options="newProductsCategoryOptions"
                value-by="value"
                text-by="text"
                :placeholder="t('outletForm.customerApp.newProductsCategoryNone')"
                :disabled="!restaurantId"
                clearable
                searchable
                class="w-full md:w-1/2"
              />
              <div class="text-sm mt-2 opacity-70">
                {{
                  restaurantId
                    ? t('outletForm.customerApp.newProductsCategoryHelp')
                    : t('outletForm.customerApp.newProductsCategoryCreateHint')
                }}
              </div>
            </div>

            <div class="flex flex-col">
              <VaSwitch
                v-model="restaurantData.customerSettings.announcementsEnabled"
                :label="t('outletForm.customerApp.announcementsEnabled')"
                left-label
                size="small"
              />
              <div class="text-sm mt-2 opacity-70">{{ t('outletForm.customerApp.announcementsEnabledHelp') }}</div>
            </div>

            <div class="flex flex-col">
              <VaSwitch
                v-model="restaurantData.pushSettings.enabled"
                :label="t('outletForm.customerApp.pushEnabled')"
                left-label
                size="small"
              />
              <div class="text-sm mt-2 opacity-70">{{ t('outletForm.customerApp.pushEnabledHelp') }}</div>

              <div v-if="restaurantData.pushSettings.enabled" class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
                <VaInput
                  v-model="restaurantData.pushSettings.androidChannelId"
                  :label="t('outletForm.customerApp.androidChannelId')"
                  name="pushAndroidChannelId"
                  :rules="[validators.required, androidChannelIdRule]"
                  :helper-text="t('outletForm.customerApp.androidChannelIdHelp')"
                />
                <VaInput
                  v-model="restaurantData.pushSettings.senderName"
                  :label="t('outletForm.customerApp.senderName')"
                  name="pushSenderName"
                  :rules="[senderNameRule]"
                  :helper-text="t('outletForm.customerApp.senderNameHelp')"
                />
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
import { useToast } from 'vuestic-ui'
import { useI18n } from 'vue-i18n'

import FileUpload from '@/components/file-uploader/FileUpload.vue'
import { validators, removeNulls } from '../../services/utils.ts'
import { useServiceStore } from '@/stores/services'
import { languages } from '@/services/languages'
import { getCategories } from '../../data/pages/categories'

// Customer-app (loyalty app) settings — outlet.customerSettings / pushSettings.
// Absent on every outlet that never set them, so the form starts from these
// (everything off) and sends a sub-document ONLY when the user changed it.
// The category is '' (not null) inside the form: VaSelect clears to '' and
// the save maps '' -> null.
const customerSettingsDefaults = () => ({
  requireEmail: false,
  newProductsCategoryId: '',
  announcementsEnabled: false,
})
const pushSettingsDefaults = () => ({
  enabled: false,
  androidChannelId: 'announcements',
  senderName: '',
})
// The shape the save compares and sends (outlets.zod.ts): '' category -> null,
// push strings trimmed. Snapshots and the dirty check both go through these,
// so surrounding spaces or a cleared select never count as a change twice.
const normaliseCustomerSettings = (cs) => {
  const merged = { ...customerSettingsDefaults(), ...(cs || {}) }
  return { ...merged, newProductsCategoryId: merged.newProductsCategoryId || null }
}
const normalisePushSettings = (ps) => {
  const merged = { ...pushSettingsDefaults(), ...(ps || {}) }
  return {
    ...merged,
    androidChannelId: String(merged.androidChannelId || '').trim(),
    senderName: String(merged.senderName || '').trim(),
  }
}
// Office-customer emails are written as plain text: the backend escapes it,
// makes an empty line a new paragraph, Enter a line break and **…** bold, and
// wraps it in the branded email. Their placeholder chips show these names;
// the {{token}} itself is the chip's tooltip.
const OFFICE_PLACEHOLDER_LABELS = {
  '{{customerName}}': 'Employee name',
  '{{employeeId}}': 'Employee ID',
  '{{password}}': 'Password',
  '{{email}}': 'Email',
  '{{outletName}}': 'Outlet name',
  '{{websiteUrl}}': 'Website',
  '{{supportPhone}}': 'Support phone',
  '{{supportEmail}}': 'Support email',
  '{{code}}': 'Reset code',
}
// Category names are a string or { en, el } (see pages/categories).
const categoryLabel = (name) =>
  typeof name === 'string' ? name : name?.en || Object.values(name || {}).find(Boolean) || ''
// Daily stock reset time: "HH:mm" 00:00–23:59 (a single-digit hour is padded,
// "5:00" -> "05:00"); null when not a valid time.
const STOCK_DAILY_RESET_TIME_DEFAULT = '05:00'
const normaliseResetTime = (value) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value ?? '').trim())
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null
  return `${m[1].padStart(2, '0')}:${m[2]}`
}
// Public holidays (closed all day): outlet.publicHolidays [{ date: 'YYYY-MM-DD', name }],
// Cyprus calendar dates. A date is valid when it is a real day of 2000–2100.
const isValidHolidayDate = (value) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? '').trim())
  if (!m) return false
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (year < 2000 || year > 2100) return false
  const d = new Date(Date.UTC(year, month - 1, day))
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
}
// A form row: the stored { date, name } plus a local v-for key (never sent).
let publicHolidayKeySeq = 0
const publicHolidayRow = (holiday) => {
  const date = String(holiday?.date ?? '').trim()
  return {
    date: /^\d{4}-\d{2}-\d{2}T/.test(date) ? date.slice(0, 10) : date,
    name: String(holiday?.name ?? ''),
    _key: `holiday-${++publicHolidayKeySeq}`,
  }
}
// Form order: by date, rows without a valid date last (in the order they were added).
const comparePublicHolidayRows = (a, b) => {
  const aValid = isValidHolidayDate(a?.date)
  const bValid = isValidHolidayDate(b?.date)
  if (aValid !== bValid) return aValid ? -1 : 1
  if (!aValid) return 0
  return a.date.trim() < b.date.trim() ? -1 : a.date.trim() > b.date.trim() ? 1 : 0
}
// The list as the save sends it: valid dates only, names trimmed, one entry per
// date (the first non-empty name wins), sorted by date.
const cleanPublicHolidays = (rows) => {
  const byDate = new Map()
  const list = Array.isArray(rows) ? rows : []
  list.forEach((row) => {
    const date = String(row?.date ?? '').trim()
    if (!isValidHolidayDate(date)) return
    const name = String(row?.name ?? '').trim()
    if (!byDate.has(date) || (!byDate.get(date) && name)) byDate.set(date, name)
  })
  return [...byDate.keys()].sort().map((date) => ({ date, name: byDate.get(date) }))
}
// This year in Cyprus (the "Fill Cyprus public holidays" range starts here).
const cyprusYear = () => {
  try {
    const year = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Nicosia', year: 'numeric' }).format(new Date()),
    )
    if (Number.isInteger(year)) return year
  } catch {
    // no Intl time zone data: fall back to the browser's year
  }
  return new Date().getFullYear()
}
// The backend's opening-hours rules (outletHours.ts): only these Opening Times
// modes restrict anything, and a 'daily' window missing either time restricts
// nothing — with "refuse online orders" on, either would accept orders 24/7.
const OPENING_TIMES_MODES = ['daily', 'byDay', 'is24h']
// A time the backend reads (its minutesOfDay): "H:mm" / "HH:mm" / "HH:mm:ss", up to 24:00.
const isOpeningTimeOfDay = (value) => {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value ?? '').trim())
  if (!m) return false
  const [hours, minutes] = [Number(m[1]), Number(m[2])]
  return minutes <= 59 && (hours < 24 || (hours === 24 && minutes === 0))
}
// "Use Winmax for stock": a database name the backend can open at all
// (winmaxSql.service) — letters, digits and underscore.
const WINMAX_DATABASE_NAME = /^[A-Za-z0-9_]+$/
// 'a', 'a and b', 'a, b and c'.
const joinWithAnd = (parts) =>
  parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`

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
    // How paid orders reach Winmax (outlet.posSalesMode) — "table" is the
    // historical kitchen flow every outlet uses unless switched.
    const posSalesModes = [
      { text: 'Table orders (kitchen requests)', value: 'table' },
      { text: 'Sales documents (retail POS, no tables)', value: 'document' },
    ]
    // When a paid pre-order (orderFor "future") is sent to Winmax
    // (outlet.futureOrderDispatch) — absent means "pickupLead", the historical
    // rule: the pickup time minus the delivery zone's lead time.
    const futureOrderDispatchModes = [
      { text: "Before pickup (the zone's lead time)", value: 'pickupLead' },
      { text: 'Same day: when paid; later days: at opening time', value: 'paidOrOpening' },
    ]
    const loyaltyTriggerOptions = [
      { text: 'On order (Winmax dispatch)', value: 'order' },
      { text: 'On delivery (delivery-system callback)', value: 'delivered' },
    ]
    const serviceStore = useServiceStore()
    const selectedType = ref(null)
    const selectedTypeMode = ref(null)
    const route = useRoute()
    const restaurantId = route.params.id
    const { init } = useToast()
    const { t } = useI18n()
    const loading = ref(false)

    const url = import.meta.env.VITE_API_BASE_URL

    // pushSettings rules mirror the backend validator (outlets.zod.ts).
    const androidChannelIdRule = (v) =>
      /^[A-Za-z0-9_.-]{1,64}$/.test((v || '').trim()) || t('outletForm.customerApp.androidChannelIdInvalid')
    const senderNameRule = (v) => (v || '').trim().length <= 80 || t('outletForm.customerApp.senderNameTooLong')

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
      languages,
      loyaltyTriggerOptions,
      posSalesModes,
      futureOrderDispatchModes,
      t,
      androidChannelIdRule,
      senderNameRule,
    }
  },
  data() {
    return {
      isProgrammaticNavigation: false,
      syncingReceiptHeader: false,
      // Delivery zones of this outlet for the "Use Winmax for stock" zone select
      stockZoneOptions: [],
      // JSON of customerSettings / pushSettings as loaded (or as defaulted on
      // create); the save sends only what differs from these.
      customerSettingsSnapshot: JSON.stringify(normaliseCustomerSettings(customerSettingsDefaults())),
      pushSettingsSnapshot: JSON.stringify(normalisePushSettings(pushSettingsDefaults())),
      // Daily stock reset { stockDailyReset, stockDailyResetTime } as loaded (or
      // defaulted on create); the save sends the pair only when it differs.
      stockDailyResetSnapshot: JSON.stringify({
        stockDailyReset: false,
        stockDailyResetTime: STOCK_DAILY_RESET_TIME_DEFAULT,
      }),
      // { publicHolidays (cleaned), enforceOpeningTimes } as loaded (or defaulted
      // on create); the save sends each only when it differs.
      orderingHoursSnapshot: JSON.stringify({ publicHolidays: [], enforceOpeningTimes: false }),
      // futureOrderDispatch as loaded (or defaulted on create); the save sends
      // it only when it differs.
      futureOrderDispatchSnapshot: 'pickupLead',
      // skipTablesInUse as loaded (or defaulted on create); the save sends it
      // only when it differs.
      skipTablesInUseSnapshot: false,
      fillingPublicHolidays: false,
      // [{ text, value }] of this outlet's live categories, for the
      // "New products category" select.
      newProductsCategoryOptions: [],
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
          failureAlertPhonesRaw: '',
        },
        // Retail POS: top-level on purpose (winmaxConfig is replaced wholesale
        // on save, a key inside it would be lost by other forms).
        posSalesMode: 'table',
        posSaleDocumentTypeCode: '',
        posQuickMenuOffers: false,
        // When pre-orders go to Winmax (top-level for the same reason); sent
        // only when changed, so an outlet left on "pickupLead" never gets the key.
        futureOrderDispatch: 'pickupLead',
        // Table numbers pass over tables still in use (top-level for the same
        // reason); sent only when changed, so an outlet left off never gets the key.
        skipTablesInUse: false,
        // Stella POS receipt (printed by the handheld; '' / '' / '' = none)
        posReceiptHeader: '',
        posReceiptFooter: '',
        posReceiptVatPercent: '',
        // Winmax retail loyalty sweep (top-level for the same reason). The
        // *Raw fields are the comma-separated inputs; arrays are built on save.
        winmaxRetailLoyalty: false,
        winmaxSqlDatabase: '',
        winmaxRetailLoyaltyDocTypesRaw: 'IR',
        winmaxRetailLoyaltyExcludeTerminalsRaw: '',
        winmaxRetailLoyaltyPaymentTypeId: 0,
        winmaxRetailLoyaltyCreditDocType: '',
        winmaxRetailLoyaltyCreditArticleCode: '',
        winmaxRetailLoyaltyRedeemDocType: '',
        winmaxRetailLoyaltyRedeemArticleCode: '',
        winmaxRetailLoyaltyPointsPerCreditEuro: 50,
        // Use Winmax for stock (top-level for the same reason). The zone is the
        // delivery zone _id whose stock column mirrors the Winmax warehouse; the
        // card also edits winmaxSqlDatabase above. The document type has no
        // input any more and goes back as loaded; the LastSync* fields are
        // written by the backend job only and shown read-only.
        winmaxStockSync: false,
        winmaxStockWarehouseCode: 0,
        winmaxStockZoneId: '',
        winmaxStockFabricationDocType: 'M+',
        winmaxStockLastSyncAt: null,
        winmaxStockLastSyncError: '',
        winmaxStockLastSyncSummary: '',
        // Daily stock reset (top-level). LastDate / LastResult are written by
        // the backend job only and shown read-only.
        stockDailyReset: false,
        stockDailyResetTime: STOCK_DAILY_RESET_TIME_DEFAULT,
        stockDailyResetLastDate: '',
        stockDailyResetLastResult: null,
        // Public holidays (rows { date, name, _key }) and "refuse online orders
        // outside the opening hours" (top-level, Cyprus time).
        publicHolidays: [],
        enforceOpeningTimes: false,
        // Strings default to '' rather than null: removeNulls() drops null keys
        // and empty objects, which would make the whole subdoc vanish from the
        // payload and blur "never configured" with "deliberately cleared".
        smsSettings: {
          enabled: false,
          username: '',
          password: '',
          senderId: '',
          baseUrl: '',
          otpTemplate: '',
        },
        turnstileSettings: {
          enabled: false,
          siteKey: '',
          secretKey: '',
        },
        loyaltySettings: {
          enabled: false,
          pointsPerEuro: 1,
          allocationTrigger: 'order',
          welcomePoints: 0,
        },
        customerSettings: customerSettingsDefaults(),
        pushSettings: pushSettingsDefaults(),
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
        useKioskWalleeTerminals: false,
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
        supportedLanguages: ['en'],
        defaultLanguage: 'en',
        brevoSenderEmail: '',
        brevoSenderName: '',
        emailSettings: {
          replyTo: '',
          logoUrl: '',
          supportPhone: '',
          supportEmail: '',
          websiteUrl: '',
          legalFooterHtml: '',
          templates: {
            registrationConfirmation: { subject: '', html: '' },
            orderConfirmation: { subject: '', html: '' },
            complaintReceived: { subject: '', html: '' },
            careerApplicationReceived: { subject: '', html: '' },
            winmaxFailureAlert: { subject: '', html: '', toOverride: [], _toOverrideRaw: '' },
            officeWelcome: { subject: '', text: '', html: '' },
            officePasswordReset: { subject: '', text: '', html: '' },
            officeAdminPasswordReset: { subject: '', text: '', html: '' },
          },
        },
      },
      active: true,
      isGalleryViewEnabled: true,
      undoDuration: 5000,
      deletedFileMessage: 'File exterminated',
      undoButtonText: 'Cancel',
      uploadLogoText: 'Upload Logo',
      uploadHeaderText: 'Upload Header',
      colorPicker: '#FF002',
      emailTemplates: [
        {
          key: 'registrationConfirmation',
          label: 'Registration Confirmation',
          vars: ['{{customerName}}'],
          subjectPlaceholder: 'Welcome {{customerName}}',
          htmlPlaceholder: '<div>Hi {{customerName}}, welcome!</div>',
          hasToOverride: false,
        },
        {
          key: 'orderConfirmation',
          label: 'Order Confirmation',
          vars: [
            '{{customerName}}',
            '{{orderNo}}',
            '{{createdAt}}',
            '{{phoneNo}}',
            '{{paymentMethod}}',
            '{{orderType}}',
            '{{promiseTime}}',
            '{{subtotal}}',
            '{{total}}',
            '{{outletName}}',
            '{{supportPhone}}',
            '{{supportEmail}}',
            '{{websiteUrl}}',
            '{{itemsHtml}}',
            '{{totalsHtml}}',
          ],
          subjectPlaceholder: 'Order Confirmation #{{orderNo}}',
          htmlPlaceholder:
            '<div>Hi {{customerName}}, your order <b>#{{orderNo}}</b> from {{outletName}}.<br/>Date: {{createdAt}}<br/>Phone: {{phoneNo}}<br/>Payment: {{paymentMethod}}<br/>{{orderType}}<br/>Total: €{{total}}</div>',
          hasToOverride: false,
        },
        {
          key: 'complaintReceived',
          label: 'Complaint Received',
          vars: ['{{orderNo}}'],
          subjectPlaceholder: 'Complaint received - Order {{orderNo}}',
          htmlPlaceholder: '<div>We received your complaint regarding order {{orderNo}}.</div>',
          hasToOverride: false,
        },
        {
          key: 'careerApplicationReceived',
          label: 'Career Application Received',
          vars: ['{{firstName}}', '{{position}}'],
          subjectPlaceholder: 'Application received - {{position}}',
          htmlPlaceholder: '<div>Thank you {{firstName}} for applying for {{position}}.</div>',
          hasToOverride: false,
        },
        {
          key: 'winmaxFailureAlert',
          label: 'Winmax Failure Alert',
          vars: ['{{orderNo}}'],
          subjectPlaceholder: 'WINMAX FAILED - {{orderNo}}',
          htmlPlaceholder: '<div>Order {{orderNo}} failed to send to Winmax.</div>',
          hasToOverride: true,
        },
        // Office-customer (employee) emails, edited as plain text (template
        // `text`, see OFFICE_PLACEHOLDER_LABELS). Empty subject/message = the
        // backend's built-in default wording is sent. subjectPlaceholder +
        // standardText are that wording, for "Use standard text".
        {
          key: 'officeWelcome',
          label: 'Office Customer Welcome',
          plainText: true,
          vars: [
            '{{customerName}}',
            '{{employeeId}}',
            '{{password}}',
            '{{email}}',
            '{{outletName}}',
            '{{websiteUrl}}',
            '{{supportPhone}}',
            '{{supportEmail}}',
          ],
          subjectPlaceholder: 'Welcome to {{outletName}} — your account is ready',
          standardText: [
            'Hi {{customerName}},',
            '',
            'An account has been created for you at {{outletName}}.',
            '',
            'Your Employee ID: **{{employeeId}}**',
            'Your initial password: **{{password}}**',
            '',
            "Open the ordering app from the shortcut on your desktop and sign in with your Employee ID and the initial password above. You'll be asked to set your own password the first time you sign in.",
            '',
            "If you weren't expecting this account, please contact your administrator.",
          ].join('\n'),
          hasToOverride: false,
          note: "The password in this email is the one typed when the employee was registered. 'Re-send welcome' can only repeat it while it is still the Employee ID — otherwise use Reset password and tick 'Email the new password'.",
        },
        {
          key: 'officePasswordReset',
          label: 'Office Customer Password Reset Code (forgot password)',
          plainText: true,
          vars: [
            '{{customerName}}',
            '{{employeeId}}',
            '{{code}}',
            '{{email}}',
            '{{outletName}}',
            '{{websiteUrl}}',
            '{{supportPhone}}',
            '{{supportEmail}}',
          ],
          subjectPlaceholder: '{{outletName}} — Your password reset code',
          standardText: [
            'Hi {{customerName}},',
            '',
            'Use this code to reset your password:',
            '',
            '**{{code}}**',
            '',
            'The code expires in 10 minutes.',
            '',
            "If you didn't request a password reset, you can safely ignore this email — your password will not change.",
          ].join('\n'),
          hasToOverride: false,
          note: "Sent when an employee uses 'Forgot password' in the app. With the message left empty, the code is shown in large type; in a typed message it's in bold.",
        },
        {
          key: 'officeAdminPasswordReset',
          label: 'Office Customer Password Reset by Admin',
          plainText: true,
          vars: [
            '{{customerName}}',
            '{{employeeId}}',
            '{{password}}',
            '{{email}}',
            '{{outletName}}',
            '{{websiteUrl}}',
            '{{supportPhone}}',
            '{{supportEmail}}',
          ],
          subjectPlaceholder: '{{outletName}} — Your password has been reset',
          standardText: [
            'Hi {{customerName}},',
            '',
            'Your password has been reset by your administrator.',
            '',
            'Your Employee ID: **{{employeeId}}**',
            '',
            'Your new temporary password: **{{password}}**',
            '',
            "Sign in to the ordering app with your Employee ID and this temporary password. You'll be asked to set your own password the next time you sign in.",
            '',
            "If you didn't expect this, please contact your administrator.",
          ].join('\n'),
          hasToOverride: false,
          note: "Sent when you tick 'Email the new password to the employee' in Office Customers → Reset password.",
        },
      ],
      placeholderLabels: OFFICE_PLACEHOLDER_LABELS,
      // Per office template: which field a placeholder chip inserts into —
      // 'subject' if the admin was last in the subject, else the message.
      tplLastField: {},
    }
  },
  computed: {
    galleryType() {
      return this.isGalleryViewEnabled ? 'gallery' : 'list'
    },
    selectedRest() {
      return this.serviceStore.selectedRest
    },
    filteredLanguages() {
      if (!this.restaurantData.supportedLanguages || this.restaurantData.supportedLanguages.length === 0) {
        return []
      }
      return this.languages.filter((lang) => this.restaurantData.supportedLanguages.includes(lang.value))
    },
    /**
     * "Use Winmax for stock": the database name the backend expects for this
     * outlet — "Winmax4_" + its Winmax company — or '' without a company.
     */
    winmaxStockExpectedDatabase() {
      const company = String(this.restaurantData.winmaxConfig?.company ?? '').trim()
      return company ? `Winmax4_${company}` : ''
    },
    /**
     * The database name the backend expects when the stored Winmax Database is
     * a well-formed name but another company's, else '' (no company, an empty
     * or malformed name, or a match in any letter case). The one rule for every
     * SQL read of the outlet's database (backend winmaxStock.math
     * winmaxDatabaseProblem): the stock sync and the table counter's read of
     * the tables open at the till. Switch-neutral — each card words its own
     * warning from it.
     */
    winmaxDatabaseMismatch() {
      const database = String(this.restaurantData.winmaxSqlDatabase ?? '').trim()
      const expected = this.winmaxStockExpectedDatabase
      if (!expected || !WINMAX_DATABASE_NAME.test(database)) return ''
      return database.toLowerCase() === expected.toLowerCase() ? '' : expected
    },
    /**
     * Red line under the card's Winmax Database input, or '': the backend only
     * syncs against the outlet's own company database (any letter case) and
     * leaves the outlet idle on another name. A warning, not a save guard.
     */
    winmaxStockDatabaseWarning() {
      const expected = this.winmaxDatabaseMismatch
      if (!expected) return ''
      return `Not the database of this outlet's Winmax company (${expected}): the stock sync stays idle until the two match.`
    },
    /**
     * Red line under "Table numbers: skip tables still in use" while it is on,
     * or '': why the backend would not read the tables open at the till — no
     * Winmax Database, a name it cannot open, no Winmax company, or another
     * company's database (the same four refusals as winmaxDatabaseProblem) —
     * and what that costs: only Stella's own orders are passed over then. A
     * warning, not a save guard: the Stella half works without it.
     */
    skipTablesInUseHint() {
      if (this.restaurantData.pos !== 'winmax' || this.restaurantData.skipTablesInUse !== true) return ''
      const database = String(this.restaurantData.winmaxSqlDatabase ?? '').trim()
      const cost = "only Stella's own orders are passed over — tables the till opened by hand are not seen."
      if (!database) return `Without the Winmax Database field ${cost}`
      if (!WINMAX_DATABASE_NAME.test(database)) {
        return `"${database}" is not a database name Stella can open (letters, digits and underscore only): ${cost}`
      }
      if (!this.winmaxStockExpectedDatabase) return `Without the Company field above ${cost}`
      const expected = this.winmaxDatabaseMismatch
      if (expected) return `Not the database of this outlet's Winmax company (${expected}): ${cost}`
      return ''
    },
    /**
     * "02/10/2026, 14:03:11 — 8 items: 6 in sync, 2 not Fabrication in Winmax
     * (A-040, A-044)": when the stock sync last ran through
     * (winmaxStockLastSyncAt; 'never' before the first time) and the backend's
     * one-line summary of it (winmaxStockLastSyncSummary — absent until the
     * backend writes one). The last error is shown after it, in red.
     */
    winmaxStockLastSyncText() {
      const at = this.restaurantData.winmaxStockLastSyncAt ? new Date(this.restaurantData.winmaxStockLastSyncAt) : null
      const when = at && !Number.isNaN(at.getTime()) ? at.toLocaleString() : 'never'
      const summary = this.restaurantData.winmaxStockLastSyncSummary
      return typeof summary === 'string' && summary.trim() ? `${when} — ${summary.trim()}` : when
    },
    /**
     * What "Use Winmax for stock" still lacks to be saved switched on, or '':
     * without a warehouse code, a stock zone and the outlet's Winmax database
     * name the backend leaves the outlet idle. Only while the switch is on and
     * its card is on screen (POS = Winmax).
     */
    winmaxStockSyncProblem() {
      if (this.restaurantData.pos !== 'winmax' || this.restaurantData.winmaxStockSync !== true) return ''
      const missing = []
      if (!(Number(this.restaurantData.winmaxStockWarehouseCode) > 0)) missing.push('the Winmax warehouse code')
      if (!this.restaurantData.winmaxStockZoneId) {
        missing.push(
          this.stockZoneOptions.length
            ? 'the stock zone'
            : 'the stock zone (none to choose from yet: add a delivery zone to this outlet first)',
        )
      }
      const database = String(this.restaurantData.winmaxSqlDatabase ?? '').trim()
      if (!database) {
        missing.push('the Winmax database name')
      } else if (!WINMAX_DATABASE_NAME.test(database)) {
        missing.push('a valid Winmax database name (letters, digits and underscore only)')
      }
      return joinWithAnd(missing)
    },
    /** Red helper under the switch while it is on with something missing: why the save is blocked. */
    winmaxStockSyncHint() {
      const problem = this.winmaxStockSyncProblem
      return problem ? `Still needed below: ${problem}. Until then the outlet cannot be saved with this switch on.` : ''
    },
    /**
     * "01/10/2026, 05:00:12 — 12 of 14 items reset, 3 pre-ordered portions
     * subtracted" from stockDailyResetLastResult {at, items, reset, preOrdered,
     * errors} (written by the backend job; the counts are numbers, an array is
     * counted too); 'never' before the first run. stockDailyResetLastDate is
     * the job's once-a-day claim, which the backend also sets when the reset
     * is switched on after the day's reset time (no reset ran then), so it
     * only stands in for a result without a readable time.
     */
    stockDailyResetSummary() {
      const r = this.restaurantData.stockDailyResetLastResult
      if (!r) return 'never'
      const count = (v) => (Array.isArray(v) ? v.length : Number(v) || 0)
      const at = r.at ? new Date(r.at) : null
      const when =
        at && !Number.isNaN(at.getTime()) ? at.toLocaleString() : this.restaurantData.stockDailyResetLastDate || ''
      let text = when ? `${when} — ` : ''
      text += `${count(r.reset)} of ${count(r.items)} item${count(r.items) === 1 ? '' : 's'} reset`
      text += `, ${count(r.preOrdered)} pre-ordered portion${count(r.preOrdered) === 1 ? '' : 's'} subtracted`
      return text
    },
    stockDailyResetErrorCount() {
      const errors = this.restaurantData.stockDailyResetLastResult?.errors
      return Array.isArray(errors) ? errors.length : Number(errors) || 0
    },
    stockDailyResetErrorText() {
      const errors = this.restaurantData.stockDailyResetLastResult?.errors
      if (!Array.isArray(errors)) return ''
      return errors.map((e) => (typeof e === 'string' ? e : e?.message || JSON.stringify(e))).join('\n')
    },
    publicHolidayRows() {
      return Array.isArray(this.restaurantData.publicHolidays) ? this.restaurantData.publicHolidays : []
    },
    /** Per row (same index): why it is not saved as it stands, or ''. */
    publicHolidayProblems() {
      const seen = new Set()
      return this.publicHolidayRows.map((row) => {
        const date = String(row?.date ?? '').trim()
        if (!date) return 'No date — this row is not saved'
        if (!isValidHolidayDate(date)) return 'Not a valid date — this row is not saved'
        if (seen.has(date)) return 'Date listed twice — saved once'
        seen.add(date)
        return ''
      })
    },
    publicHolidayFillYears() {
      const from = cyprusYear()
      return { from, to: from + 1 }
    },
    /**
     * What the Opening Times lack for "refuse online orders" to mean anything,
     * or '': no mode chosen, or 'daily' without both an opening and a closing
     * time (the form keeps those in openingTime / closingTime).
     */
    enforceOpeningTimesProblem() {
      const mode = String(this.restaurantData.openingTimes?.selected ?? '').trim()
      if (!OPENING_TIMES_MODES.includes(mode)) return 'Set the Opening Times above first'
      if (
        mode === 'daily' &&
        !(isOpeningTimeOfDay(this.restaurantData.openingTime) && isOpeningTimeOfDay(this.restaurantData.closingTime))
      ) {
        return 'Set the Opening Times above first (Daily needs an opening and a closing time)'
      }
      return ''
    },
    /** Helper under the switch: why it is disabled (off), or why the save is blocked (on). */
    enforceOpeningTimesHint() {
      const problem = this.enforceOpeningTimesProblem
      if (!problem) return ''
      return this.restaurantData.enforceOpeningTimes === true
        ? `${problem}, or switch this off: the outlet cannot be saved while it is on without opening hours.`
        : `${problem}.`
    },
  },
  watch: {
    'restaurantData.supportedLanguages'(newVal) {
      if (!newVal || newVal.length === 0) {
        this.restaurantData.defaultLanguage = ''
        return
      }
      if (!newVal.includes(this.restaurantData.defaultLanguage)) {
        this.restaurantData.defaultLanguage = newVal[0]
      }
    },
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
    /**
     * Stella POS receipt header ← Winmax: reads the Winmax service zone whose
     * POSSaleDocumentTypeCode matches the SAVED sales document type and drops
     * its DocumentsHeader lines into the textarea (GET /winmax/pos-receipt-context,
     * fresh=1 skips the server's 10-minute cache). The SHOP's document type is
     * preferred: on DEMO2 the outlet default "IR" is the warehouse zone, while
     * the delivery zone (shop) POW! PLATEIA carries "IR4" with the real shop
     * header. Winmax has no footer and only a list of VAT rates — manual.
     */
    /**
     * Delivery zones of this outlet as options for the "Use Winmax for stock"
     * zone select. Fail-open: an error just leaves the list empty.
     */
    async loadStockZoneOptions() {
      if (!this.restaurantId) return
      try {
        const url = import.meta.env.VITE_API_BASE_URL
        const z = await axios.get(`${url}/deliveryZones/${this.restaurantId}`)
        const list = Array.isArray(z.data) ? z.data : z.data?.data || []
        this.stockZoneOptions = list
          .filter((dz) => dz && !dz.isDeleted)
          .map((dz) => ({ text: dz.name, value: String(dz._id) }))
      } catch {
        this.stockZoneOptions = []
      }
    },
    async syncReceiptHeaderFromWinmax() {
      if (!this.restaurantId || this.syncingReceiptHeader) return
      this.syncingReceiptHeader = true
      try {
        const url = import.meta.env.VITE_API_BASE_URL
        // Shops (delivery zones) with their own sales document type, if any.
        let shopZones = []
        try {
          const z = await axios.get(`${url}/deliveryZones/${this.restaurantId}`)
          const list = Array.isArray(z.data) ? z.data : z.data?.data || []
          shopZones = list.filter((dz) => dz && !dz.isDeleted && String(dz.posSaleDocumentTypeCode || '').trim())
        } catch {
          shopZones = []
        }
        const shop = shopZones[0]
        const res = await axios.get(`${url}/winmax/pos-receipt-context`, {
          params: { outletId: this.restaurantId, fresh: 1, ...(shop ? { deliveryZoneId: shop._id } : {}) },
        })
        const ctx = res.data?.data || {}
        const others = shopZones.slice(1).map((dz) => `${dz.name} (${dz.posSaleDocumentTypeCode})`)
        const lines = Array.isArray(ctx.documentsHeader) ? ctx.documentsHeader.filter(Boolean) : []
        if (!ctx.documentMode) {
          this.init({
            message: 'Save the outlet with "Sales documents" mode and a sales document type first.',
            color: 'warning',
          })
        } else if (!lines.length) {
          this.init({
            message: `No Winmax service zone matches sales document type "${ctx.documentTypeCode || '?'}" — check the Winmax settings and document type, then save and retry.`,
            color: 'warning',
          })
        } else {
          this.restaurantData.posReceiptHeader = lines.join('\n')
          this.init({
            message:
              `Header loaded from Winmax zone "${ctx.designation || ctx.serviceZoneCode}" (${ctx.documentTypeCode})` +
              (shop ? ` via shop "${shop.name}"` : ' via the outlet default document type') +
              (others.length ? `. Other shops not used: ${others.join(', ')}` : '') +
              '. Save to keep it.',
            color: 'success',
            duration: 8000,
          })
        }
      } catch (e) {
        this.init({ message: e?.response?.data?.message || e?.message || 'Winmax sync failed', color: 'danger' })
      } finally {
        this.syncingReceiptHeader = false
      }
    },
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
    insertVar(templateKey, variable) {
      const refKey = 'htmlarea-' + templateKey
      const el = this.$refs[refKey]
      const textarea = Array.isArray(el) ? el[0] : el
      if (!textarea) return
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const current = this.restaurantData.emailSettings.templates[templateKey].html || ''
      this.restaurantData.emailSettings.templates[templateKey].html =
        current.slice(0, start) + variable + current.slice(end)
      this.$nextTick(() => {
        textarea.focus()
        const pos = start + variable.length
        textarea.setSelectionRange(pos, pos)
      })
    },
    // Office (plain-text) templates: insert a {{placeholder}} at the cursor of
    // the field the admin was last in — the message, unless that was the subject.
    insertPlaceholder(templateKey, token) {
      const field = this.tplLastField[templateKey] === 'subject' ? 'subject' : 'text'
      const fieldRef = this.$refs[(field === 'subject' ? 'subject-' : 'message-') + templateKey]
      const component = Array.isArray(fieldRef) ? fieldRef[0] : fieldRef
      const el = component?.$el?.querySelector(field === 'subject' ? 'input' : 'textarea')
      const tpl = this.restaurantData.emailSettings.templates[templateKey]
      const current = tpl[field] || ''
      // A field that was never clicked into has its cursor at the end.
      const start = typeof el?.selectionStart === 'number' ? el.selectionStart : current.length
      const end = typeof el?.selectionEnd === 'number' ? el.selectionEnd : start
      tpl[field] = current.slice(0, start) + token + current.slice(end)
      this.$nextTick(() => {
        if (!el) return
        el.focus()
        const pos = start + token.length
        el.setSelectionRange(pos, pos)
      })
    },
    // "Use standard text": the backend's built-in wording, as editable text.
    applyStandardText(tplDef) {
      const tpl = this.restaurantData.emailSettings.templates[tplDef.key]
      if (
        (tpl.text || '').trim() &&
        !window.confirm('Replace the current subject and message with the standard text?')
      ) {
        return
      }
      tpl.subject = tplDef.subjectPlaceholder
      tpl.text = tplDef.standardText
    },
    // An office template's HTML from the old editor is sent while the message
    // is empty; clearing it brings back the backend's built-in email.
    removeOldHtml(templateKey) {
      if (
        !window.confirm(
          'Remove the old HTML version of this email? While the message is empty, the built-in email will be sent instead (once you save).',
        )
      ) {
        return
      }
      this.restaurantData.emailSettings.templates[templateKey].html = ''
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
            res.supportedLanguages = res.supportedLanguages || ['en']
            res.defaultLanguage = res.defaultLanguage || 'en'
            // Ensure emailSettings and template defaults exist
            if (!res.emailSettings) res.emailSettings = {}
            if (!res.emailSettings.templates) res.emailSettings.templates = {}
            // Outlets without winmaxConfig (e.g. dev DBs, where the prod-to-dev
            // clone strips POS credentials) would otherwise crash the template at
            // restaurantData.winmaxConfig.company when pos === 'winmax', leaving
            // the whole Configuration section blank.
            res.winmaxConfig = {
              company: '',
              user: '',
              password: '',
              terminal: '',
              failureAlertPhones: [],
              ...(res.winmaxConfig || {}),
            }
            // Outlets saved before the retail POS fields existed have no key;
            // absent means the historical table flow.
            res.posSalesMode = res.posSalesMode === 'document' ? 'document' : 'table'
            res.posSaleDocumentTypeCode = res.posSaleDocumentTypeCode || ''
            res.posQuickMenuOffers = res.posQuickMenuOffers === true
            // Pre-order dispatch: outlets saved before the field existed have no
            // key; absent (or anything else) means the historical "before pickup".
            res.futureOrderDispatch = res.futureOrderDispatch === 'paidOrOpening' ? 'paidOrOpening' : 'pickupLead'
            // Skip tables still in use: outlets saved before the field existed
            // have no key; absent (or anything but true) means off.
            res.skipTablesInUse = res.skipTablesInUse === true
            res.posReceiptHeader = res.posReceiptHeader || ''
            res.posReceiptFooter = res.posReceiptFooter || ''
            res.posReceiptVatPercent =
              res.posReceiptVatPercent === null || res.posReceiptVatPercent === undefined ? '' : String(res.posReceiptVatPercent)
            // Winmax retail loyalty: outlets saved before these fields existed
            // have no keys; arrays become the comma-separated inputs.
            res.winmaxRetailLoyalty = res.winmaxRetailLoyalty === true
            res.winmaxSqlDatabase = res.winmaxSqlDatabase || ''
            res.winmaxRetailLoyaltyDocTypesRaw = (res.winmaxRetailLoyaltyDocTypes ?? ['IR']).join(', ')
            res.winmaxRetailLoyaltyExcludeTerminalsRaw = (res.winmaxRetailLoyaltyExcludeTerminals ?? []).join(', ')
            res.winmaxRetailLoyaltyPaymentTypeId = Number(res.winmaxRetailLoyaltyPaymentTypeId) || 0
            res.winmaxRetailLoyaltyCreditDocType = res.winmaxRetailLoyaltyCreditDocType || ''
            res.winmaxRetailLoyaltyCreditArticleCode = res.winmaxRetailLoyaltyCreditArticleCode || ''
            res.winmaxRetailLoyaltyRedeemDocType = res.winmaxRetailLoyaltyRedeemDocType || ''
            res.winmaxRetailLoyaltyRedeemArticleCode = res.winmaxRetailLoyaltyRedeemArticleCode || ''
            res.winmaxRetailLoyaltyPointsPerCreditEuro = Number(res.winmaxRetailLoyaltyPointsPerCreditEuro) || 50
            // Use Winmax for stock: outlets saved before these fields existed have no keys.
            res.winmaxStockSync = res.winmaxStockSync === true
            res.winmaxStockWarehouseCode = Number(res.winmaxStockWarehouseCode) || 0
            res.winmaxStockZoneId = res.winmaxStockZoneId ? String(res.winmaxStockZoneId) : ''
            res.winmaxStockFabricationDocType = res.winmaxStockFabricationDocType || 'M+'
            res.winmaxStockLastSyncAt = res.winmaxStockLastSyncAt || null
            res.winmaxStockLastSyncError = res.winmaxStockLastSyncError || ''
            res.winmaxStockLastSyncSummary =
              typeof res.winmaxStockLastSyncSummary === 'string' ? res.winmaxStockLastSyncSummary : ''
            // Daily stock reset: outlets saved before these fields existed have no keys.
            res.stockDailyReset = res.stockDailyReset === true
            res.stockDailyResetTime = normaliseResetTime(res.stockDailyResetTime) || STOCK_DAILY_RESET_TIME_DEFAULT
            res.stockDailyResetLastDate = res.stockDailyResetLastDate || ''
            res.stockDailyResetLastResult =
              res.stockDailyResetLastResult && typeof res.stockDailyResetLastResult === 'object'
                ? res.stockDailyResetLastResult
                : null
            // Public holidays / enforce opening times: outlets saved before these
            // fields existed have no keys (= no dates, not enforced).
            res.publicHolidays = (Array.isArray(res.publicHolidays) ? res.publicHolidays : []).map((holiday) =>
              publicHolidayRow(holiday),
            )
            res.publicHolidays.sort(comparePublicHolidayRows)
            res.enforceOpeningTimes = res.enforceOpeningTimes === true
            // Outlets saved before smsSettings existed have no such key, and
            // `this.restaurantData = res` below replaces the defaults wholesale
            // — without this the v-models in the SMS card would throw.
            res.smsSettings = {
              enabled: false,
              username: '',
              password: '',
              senderId: '',
              baseUrl: '',
              otpTemplate: '',
              ...(res.smsSettings || {}),
            }
            res.turnstileSettings = {
              enabled: false,
              siteKey: '',
              secretKey: '',
              ...(res.turnstileSettings || {}),
            }
            res.loyaltySettings = {
              enabled: false,
              pointsPerEuro: 1,
              allocationTrigger: 'order',
              welcomePoints: 0,
              ...(res.loyaltySettings || {}),
            }
            // Customer-app settings: absent on every outlet that never set
            // them (all other brands) -> defaults, everything off.
            res.customerSettings = { ...customerSettingsDefaults(), ...(res.customerSettings || {}) }
            const newProductsCategory = res.customerSettings.newProductsCategoryId
            res.customerSettings.newProductsCategoryId = newProductsCategory
              ? String(newProductsCategory._id || newProductsCategory)
              : ''
            res.pushSettings = { ...pushSettingsDefaults(), ...(res.pushSettings || {}) }
            const tplDefaults = {
              registrationConfirmation: { subject: '', html: '' },
              orderConfirmation: { subject: '', html: '' },
              complaintReceived: { subject: '', html: '' },
              careerApplicationReceived: { subject: '', html: '' },
              winmaxFailureAlert: { subject: '', html: '', toOverride: [], _toOverrideRaw: '' },
              officeWelcome: { subject: '', text: '', html: '' },
              officePasswordReset: { subject: '', text: '', html: '' },
              officeAdminPasswordReset: { subject: '', text: '', html: '' },
            }
            // Only these (the editor's) keys get defaults + the <div> strip
            // below; any other template on the outlet (officeStatement,
            // voucherCode, ...) is left untouched and passed through on save.
            Object.keys(tplDefaults).forEach((key) => {
              res.emailSettings.templates[key] = {
                ...tplDefaults[key],
                ...res.emailSettings.templates[key],
              }
            })
            // Convert toOverride array → comma-separated raw string for the UI
            const wfa = res.emailSettings.templates.winmaxFailureAlert
            wfa._toOverrideRaw = Array.isArray(wfa.toOverride) ? wfa.toOverride.join(', ') : ''
            // Strip outer <div>…</div> wrapper added on save so the textarea shows clean inner content
            const stripOuterDiv = (html) => {
              if (!html) return ''
              const m = html.trim().match(/^<div>([\s\S]*)<\/div>$/i)
              return m ? m[1].trim() : html
            }
            // Plain-text (office) templates keep their html exactly as loaded:
            // it isn't shown in the editor and goes back unchanged on save.
            const plainTextKeys = this.emailTemplates.filter((t) => t.plainText).map((t) => t.key)
            Object.keys(tplDefaults).forEach((key) => {
              if (plainTextKeys.includes(key)) return
              res.emailSettings.templates[key].html = stripOuterDiv(res.emailSettings.templates[key].html)
            })
          }
          // Convert failureAlertPhones array to comma-separated string for the input
          if (res.winmaxConfig) {
            res.winmaxConfig.failureAlertPhonesRaw = (res.winmaxConfig.failureAlertPhones ?? []).join(', ')
          }
          this.restaurantData = res
          if (res) {
            this.loadStockZoneOptions()
            this.snapshotCustomerAppSettings()
            this.snapshotStockDailyReset()
            this.snapshotOrderingHours()
            this.snapshotFutureOrderDispatch()
            this.snapshotSkipTablesInUse()
            this.fetchNewProductsCategories()
          }
          this.loading = false
        } catch (error) {
          console.error('Error fetching restaurant details:', error)
          this.loading = false
        }
      }
    },
    /**
     * Customer-app settings (customerSettings / pushSettings). The snapshot is
     * re-taken after every load and every successful save, so a save sends
     * only the keys the user changed since — the backend flattens a partial
     * sub-document to dot paths, and an outlet whose admin merely saved
     * another field never gets these sub-documents materialised.
     */
    snapshotCustomerAppSettings() {
      this.customerSettingsSnapshot = JSON.stringify(normaliseCustomerSettings(this.restaurantData.customerSettings))
      this.pushSettingsSnapshot = JSON.stringify(normalisePushSettings(this.restaurantData.pushSettings))
    },
    /** `{ customerSettings?, pushSettings? }` — only the changed keys; `{}` when nothing changed. */
    changedCustomerAppSettings() {
      const changedKeys = (current, snapshot) => {
        const before = JSON.parse(snapshot || '{}')
        const changed = {}
        Object.keys(current || {}).forEach((key) => {
          if (JSON.stringify(current[key]) !== JSON.stringify(before[key])) changed[key] = current[key]
        })
        return changed
      }
      const patch = {}
      const customer = changedKeys(
        normaliseCustomerSettings(this.restaurantData.customerSettings),
        this.customerSettingsSnapshot,
      )
      if (Object.keys(customer).length) patch.customerSettings = customer
      const push = changedKeys(normalisePushSettings(this.restaurantData.pushSettings), this.pushSettingsSnapshot)
      // The backend refuses an empty channel id (min 1): a field cleared and then
      // hidden by switching push off is simply not sent — the stored one stays.
      if (push.androidChannelId === '') delete push.androidChannelId
      if (Object.keys(push).length) patch.pushSettings = push
      return patch
    },
    /** VaInput rule of the daily stock reset time. */
    stockDailyResetTimeRule(value) {
      return normaliseResetTime(value) !== null || 'Enter a time as HH:mm, e.g. 05:00'
    },
    /** The daily stock reset pair as the save sends it (an invalid time keeps the stored one). */
    currentStockDailyReset() {
      const before = JSON.parse(this.stockDailyResetSnapshot || '{}')
      return {
        stockDailyReset: this.restaurantData.stockDailyReset === true,
        stockDailyResetTime:
          normaliseResetTime(this.restaurantData.stockDailyResetTime) ||
          before.stockDailyResetTime ||
          STOCK_DAILY_RESET_TIME_DEFAULT,
      }
    },
    /** Re-taken after every load and every successful save, like the customer-app snapshot. */
    snapshotStockDailyReset() {
      this.stockDailyResetSnapshot = JSON.stringify(this.currentStockDailyReset())
    },
    /**
     * `{ stockDailyReset, stockDailyResetTime }` when either changed since the
     * snapshot, else `{}` — an outlet whose admin never touches the card saves
     * exactly the payload it did before. Both keys ride together so the
     * backend always holds an explicit time once the reset is switched on.
     */
    changedStockDailyReset() {
      const current = this.currentStockDailyReset()
      return JSON.stringify(current) === this.stockDailyResetSnapshot ? {} : current
    },
    /** Public holidays (cleaned) + enforceOpeningTimes as the save sends them. */
    currentOrderingHours() {
      return {
        publicHolidays: cleanPublicHolidays(this.restaurantData.publicHolidays),
        enforceOpeningTimes: this.restaurantData.enforceOpeningTimes === true,
      }
    },
    /** Re-taken after every load and every successful save, like the stock reset snapshot. */
    snapshotOrderingHours() {
      this.orderingHoursSnapshot = JSON.stringify(this.currentOrderingHours())
    },
    /**
     * `{ publicHolidays?, enforceOpeningTimes? }` — each key only when it
     * differs from the snapshot, else `{}`: an outlet whose admin never touches
     * the holidays list or the switch saves exactly the payload it did before.
     * Attached after removeNulls, so clearing the whole list sends `[]`.
     */
    changedOrderingHours() {
      const current = this.currentOrderingHours()
      const before = JSON.parse(this.orderingHoursSnapshot || '{}')
      const changed = {}
      Object.keys(current).forEach((key) => {
        if (JSON.stringify(current[key]) !== JSON.stringify(before[key])) changed[key] = current[key]
      })
      return changed
    },
    /** The pre-order dispatch rule as the save sends it (anything but "paidOrOpening" is "pickupLead"). */
    currentFutureOrderDispatch() {
      return this.restaurantData.futureOrderDispatch === 'paidOrOpening' ? 'paidOrOpening' : 'pickupLead'
    },
    /** Re-taken after every load and every successful save, like the ordering-hours snapshot. */
    snapshotFutureOrderDispatch() {
      this.futureOrderDispatchSnapshot = this.currentFutureOrderDispatch()
    },
    /**
     * `{ futureOrderDispatch }` when the select changed since the snapshot, else
     * `{}`: an outlet whose admin never touches it saves exactly the payload it
     * did before (the backend reads a missing key as "pickupLead", and a changed
     * value makes it move the pre-orders already waiting in the Winmax queue).
     */
    changedFutureOrderDispatch() {
      const current = this.currentFutureOrderDispatch()
      return current === this.futureOrderDispatchSnapshot ? {} : { futureOrderDispatch: current }
    },
    /** "Skip tables still in use" as the save sends it (anything but true is off). */
    currentSkipTablesInUse() {
      return this.restaurantData.skipTablesInUse === true
    },
    /** Re-taken after every load and every successful save, like the pre-order dispatch snapshot. */
    snapshotSkipTablesInUse() {
      this.skipTablesInUseSnapshot = this.currentSkipTablesInUse()
    },
    /**
     * `{ skipTablesInUse }` when the switch changed since the snapshot, else `{}`:
     * an outlet whose admin never touches it saves exactly the payload it did
     * before, so other brands' saved outlets never get the key (the backend
     * reads a missing key as off and hands out table numbers as it always has).
     */
    changedSkipTablesInUse() {
      const current = this.currentSkipTablesInUse()
      return current === this.skipTablesInUseSnapshot ? {} : { skipTablesInUse: current }
    },
    /**
     * Save guard: false (with a toast) while "refuse online orders" is on but the
     * Opening Times restrict nothing — saved like that the outlet would take
     * orders 24/7. Switching it off always passes, so an outlet saved in that
     * state can still be fixed either way.
     */
    enforceOpeningTimesSaveAllowed() {
      if (this.restaurantData.enforceOpeningTimes !== true || !this.enforceOpeningTimesProblem) return true
      this.init({
        message: `Not saved: "Refuse online orders outside these hours" is on without opening hours. ${this.enforceOpeningTimesProblem}, or switch it off.`,
        color: 'danger',
      })
      return false
    },
    /**
     * Save guard: false (with a toast) while "Use Winmax for stock" is on without
     * a warehouse code, a stock zone or a usable Winmax database name — saved
     * like that the backend would leave the outlet idle. Switching it off always
     * passes, and an outlet with it off is never checked: its save is as before.
     */
    winmaxStockSyncSaveAllowed() {
      const problem = this.winmaxStockSyncProblem
      if (!problem) return true
      this.init({
        message: `Not saved: "Use Winmax for stock" is on without ${problem}. Fill that in under the switch, or switch it off.`,
        color: 'danger',
      })
      return false
    },
    /** Keeps the holiday rows in date order (rows without a valid date last). */
    sortPublicHolidays() {
      if (Array.isArray(this.restaurantData.publicHolidays)) {
        this.restaurantData.publicHolidays.sort(comparePublicHolidayRows)
      }
    },
    addPublicHoliday() {
      if (!Array.isArray(this.restaurantData.publicHolidays)) this.restaurantData.publicHolidays = []
      this.restaurantData.publicHolidays.push(publicHolidayRow({}))
    },
    removePublicHoliday(holiday) {
      this.restaurantData.publicHolidays = this.publicHolidayRows.filter((row) => row !== holiday)
    },
    /**
     * Merges the backend's Cyprus public holidays for this year and next into
     * the list by date: rows already listed (and their names) are kept, only
     * missing dates are added, then the list is re-sorted. Saved on Save.
     */
    async fillCyprusPublicHolidays() {
      if (this.fillingPublicHolidays) return
      this.fillingPublicHolidays = true
      const { from, to } = this.publicHolidayFillYears
      try {
        const url = import.meta.env.VITE_API_BASE_URL
        const res = await axios.get(`${url}/outlets/public-holidays/cyprus`, { params: { from, to } })
        const holidays = res.data?.holidays ?? res.data?.data?.holidays
        if (!Array.isArray(holidays)) throw new Error('Unexpected reply from the public holidays service')
        if (!Array.isArray(this.restaurantData.publicHolidays)) this.restaurantData.publicHolidays = []
        const rows = this.restaurantData.publicHolidays
        const listed = new Set(rows.map((row) => String(row?.date ?? '').trim()))
        let added = 0
        holidays.forEach((holiday) => {
          const date = String(holiday?.date ?? '').trim()
          if (!isValidHolidayDate(date) || listed.has(date)) return
          listed.add(date)
          rows.push(publicHolidayRow({ date, name: String(holiday?.name ?? '').trim() }))
          added += 1
        })
        this.sortPublicHolidays()
        this.init({
          message: added
            ? `Added ${added} Cyprus public holiday${added === 1 ? '' : 's'} (${from}–${to}). Save to keep them.`
            : `The Cyprus public holidays for ${from}–${to} are all listed already.`,
          color: added ? 'success' : 'info',
        })
      } catch (e) {
        const reason = e?.response?.data?.message || e?.message || 'request failed'
        this.init({ message: `Could not load the Cyprus public holidays: ${reason}`, color: 'danger' })
      } finally {
        this.fillingPublicHolidays = false
      }
    },
    /** This outlet's live categories -> options of the "New products category" select. */
    async fetchNewProductsCategories() {
      if (!this.restaurantId) return
      try {
        const { data } = await getCategories(this.restaurantId, 'name', 'asc')
        const list = Array.isArray(data) ? data : data?.data || []
        this.newProductsCategoryOptions = list
          .filter((category) => category && category._id && !category.isDeleted)
          .map((category) => ({
            value: String(category._id),
            text: category.code ? `${categoryLabel(category.name)} (${category.code})` : categoryLabel(category.name),
          }))
      } catch (error) {
        console.error('Error fetching categories for the New products select:', error)
        this.newProductsCategoryOptions = []
        this.init({ message: this.t('outletForm.customerApp.categoriesLoadFailed'), color: 'danger' })
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
        posSalesMode: this.restaurantData.posSalesMode === 'document' ? 'document' : 'table',
        posSaleDocumentTypeCode: (this.restaurantData.posSaleDocumentTypeCode || '').trim(),
        posQuickMenuOffers: this.restaurantData.posQuickMenuOffers === true,
        // Stella POS receipt: '' clears the header/footer; VAT '' -> null (no VAT block)
        posReceiptHeader: String(this.restaurantData.posReceiptHeader || '').trim(),
        posReceiptFooter: String(this.restaurantData.posReceiptFooter || '').trim(),
        posReceiptVatPercent:
          String(this.restaurantData.posReceiptVatPercent ?? '').trim() === '' ||
          !Number.isFinite(Number(this.restaurantData.posReceiptVatPercent))
            ? null
            : Number(this.restaurantData.posReceiptVatPercent),
        // Winmax retail loyalty (comma-separated inputs -> arrays; codes upper-cased)
        winmaxRetailLoyalty: this.restaurantData.winmaxRetailLoyalty === true,
        winmaxSqlDatabase: (this.restaurantData.winmaxSqlDatabase || '').trim(),
        winmaxRetailLoyaltyDocTypes: (this.restaurantData.winmaxRetailLoyaltyDocTypesRaw || '')
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
        winmaxRetailLoyaltyExcludeTerminals: (this.restaurantData.winmaxRetailLoyaltyExcludeTerminalsRaw || '')
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0),
        winmaxRetailLoyaltyPaymentTypeId: Number(this.restaurantData.winmaxRetailLoyaltyPaymentTypeId) || 0,
        winmaxRetailLoyaltyCreditDocType: (this.restaurantData.winmaxRetailLoyaltyCreditDocType || '')
          .trim()
          .toUpperCase(),
        winmaxRetailLoyaltyCreditArticleCode: (this.restaurantData.winmaxRetailLoyaltyCreditArticleCode || '').trim(),
        winmaxRetailLoyaltyRedeemDocType: (this.restaurantData.winmaxRetailLoyaltyRedeemDocType || '')
          .trim()
          .toUpperCase(),
        winmaxRetailLoyaltyRedeemArticleCode: (this.restaurantData.winmaxRetailLoyaltyRedeemArticleCode || '').trim(),
        winmaxRetailLoyaltyPointsPerCreditEuro:
          Number(this.restaurantData.winmaxRetailLoyaltyPointsPerCreditEuro) || 50,
        // Use Winmax for stock (last-sync fields are written by the backend job
        // only; the document type has no input any more and goes back as loaded)
        winmaxStockSync: this.restaurantData.winmaxStockSync === true,
        winmaxStockWarehouseCode: Number(this.restaurantData.winmaxStockWarehouseCode) || 0,
        winmaxStockZoneId: this.restaurantData.winmaxStockZoneId || null,
        winmaxStockFabricationDocType:
          (this.restaurantData.winmaxStockFabricationDocType || 'M+').trim().toUpperCase() || 'M+',
        winmaxConfig: {
          ...this.restaurantData.winmaxConfig,
          terminal: this.restaurantData.winmaxConfig.terminal || null,
          serviceZoneId: this.restaurantData.winmaxConfig.serviceZoneId || null,
          failureAlertPhones: (this.restaurantData.winmaxConfig.failureAlertPhonesRaw || '')
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean),
          failureAlertPhonesRaw: undefined,
        },
        // Keys enumerated explicitly rather than spread: the backend $set
        // replaces the whole subdocument, so a key omitted here is erased.
        loyaltySettings: {
          enabled: !!this.restaurantData.loyaltySettings?.enabled,
          pointsPerEuro: Math.max(0, Number(this.restaurantData.loyaltySettings?.pointsPerEuro) || 0),
          allocationTrigger:
            this.restaurantData.loyaltySettings?.allocationTrigger === 'delivered' ? 'delivered' : 'order',
          welcomePoints: Math.max(0, Math.floor(Number(this.restaurantData.loyaltySettings?.welcomePoints) || 0)),
        },
        smsSettings: {
          enabled: !!this.restaurantData.smsSettings?.enabled,
          username: this.restaurantData.smsSettings?.username || '',
          password: this.restaurantData.smsSettings?.password || '',
          senderId: this.restaurantData.smsSettings?.senderId || '',
          baseUrl: this.restaurantData.smsSettings?.baseUrl || '',
          otpTemplate: this.restaurantData.smsSettings?.otpTemplate || '',
        },
        turnstileSettings: {
          enabled: !!this.restaurantData.turnstileSettings?.enabled,
          siteKey: this.restaurantData.turnstileSettings?.siteKey || '',
          secretKey: this.restaurantData.turnstileSettings?.secretKey || '',
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
        useKioskWalleeTerminals: this.restaurantData.useKioskWalleeTerminals || false,
        supportedLanguages: this.restaurantData.supportedLanguages || ['en'],
        defaultLanguage: this.restaurantData.defaultLanguage || 'en',
        brevoSenderEmail: this.restaurantData.brevoSenderEmail || '',
        brevoSenderName: this.restaurantData.brevoSenderName || '',
        emailSettings: (() => {
          const es = this.restaurantData.emailSettings || {}
          const tpl = es.templates || {}
          const wrapHtml = (raw) => {
            const trimmed = (raw || '').trim()
            if (!trimmed) return ''
            // Don't double-wrap if the admin already opened with a root <div>
            if (/^<div[\s>]/i.test(trimmed)) return trimmed
            return `<div>${trimmed}</div>`
          }
          const mapTpl = (key, extras) => ({
            subject: tpl[key]?.subject || '',
            html: wrapHtml(tpl[key]?.html),
            ...extras,
          })
          // Office templates: the admin's line breaks and spaces ARE the
          // formatting, so only trailing whitespace is dropped; html (not
          // editable here) goes back exactly as loaded.
          const mapPlainTextTpl = (key) => ({
            subject: tpl[key]?.subject || '',
            text: (tpl[key]?.text || '').trimEnd(),
            html: tpl[key]?.html ?? '',
          })
          // The backend $sets emailSettings as a whole, so a template this
          // editor doesn't manage (officeStatement, voucherCode,
          // voucherFailureAlert, anything added later) would be wiped on every
          // outlet save. Carry those over exactly as loaded.
          const managedKeys = this.emailTemplates.map((t) => t.key)
          const unmanagedTemplates = Object.fromEntries(
            Object.entries(tpl).filter(([key]) => !managedKeys.includes(key)),
          )
          return {
            replyTo: es.replyTo || '',
            logoUrl: es.logoUrl || '',
            supportPhone: es.supportPhone || '',
            supportEmail: es.supportEmail || '',
            websiteUrl: es.websiteUrl || '',
            legalFooterHtml: es.legalFooterHtml || '',
            templates: {
              ...unmanagedTemplates,
              registrationConfirmation: mapTpl('registrationConfirmation'),
              orderConfirmation: mapTpl('orderConfirmation'),
              complaintReceived: mapTpl('complaintReceived'),
              careerApplicationReceived: mapTpl('careerApplicationReceived'),
              winmaxFailureAlert: {
                ...mapTpl('winmaxFailureAlert'),
                toOverride: (tpl.winmaxFailureAlert?._toOverrideRaw || '')
                  .split(',')
                  .map((e) => e.trim())
                  .filter(Boolean),
              },
              officeWelcome: mapPlainTextTpl('officeWelcome'),
              officePasswordReset: mapPlainTextTpl('officePasswordReset'),
              officeAdminPasswordReset: mapPlainTextTpl('officeAdminPasswordReset'),
            },
          }
        })(),
      }
      return data
    },
    async createRestaurant() {
      if (this.$refs.form.validate()) {
        if (!this.enforceOpeningTimesSaveAllowed()) return
        if (!this.winmaxStockSyncSaveAllowed()) return
        const data = removeNulls(this.createPayload())
        // Customer-app settings only when the user touched them on the create form.
        Object.assign(data, this.changedCustomerAppSettings())
        // Daily stock reset likewise (off / 05:00 = not sent).
        Object.assign(data, this.changedStockDailyReset())
        // Public holidays / enforce opening times likewise (none / off = not sent).
        Object.assign(data, this.changedOrderingHours())
        // Pre-order dispatch likewise ("before pickup" = not sent).
        Object.assign(data, this.changedFutureOrderDispatch())
        // Skip tables still in use likewise (off = not sent).
        Object.assign(data, this.changedSkipTablesInUse())
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
        if (!this.enforceOpeningTimesSaveAllowed()) return
        if (!this.winmaxStockSyncSaveAllowed()) return
        const data = removeNulls(this.createPayload())
        const url = import.meta.env.VITE_API_BASE_URL
        delete data.name
        // Customer-app sub-documents ride along ONLY when changed, attached
        // after removeNulls so a `newProductsCategoryId: null` clear survives.
        Object.assign(data, this.changedCustomerAppSettings())
        // Daily stock reset: the { stockDailyReset, stockDailyResetTime } pair
        // only when changed (the last-reset fields are never sent).
        Object.assign(data, this.changedStockDailyReset())
        // Public holidays (cleaned) / enforceOpeningTimes: each only when changed.
        Object.assign(data, this.changedOrderingHours())
        // Pre-order dispatch: only when changed (the backend then reschedules
        // this outlet's waiting pre-orders).
        Object.assign(data, this.changedFutureOrderDispatch())
        // Skip tables still in use: only when changed, so other brands' saved
        // outlets never get the key.
        Object.assign(data, this.changedSkipTablesInUse())

        let response
        try {
          response = await axios.patch(`${url}/outlets/${this.restaurantId}`, data)
        } catch (error) {
          // e.g. 400 "customerSettings.newProductsCategoryId is not a category of this outlet"
          this.init({
            message: error?.response?.data?.message || this.t('outletForm.customerApp.saveFailed'),
            color: 'danger',
          })
          return
        }

        if (response.status === 200) {
          this.init({ message: "You've successfully updated outlet", color: 'success' })
          this.snapshotCustomerAppSettings()
          this.snapshotStockDailyReset()
          this.snapshotOrderingHours()
          this.snapshotFutureOrderDispatch()
          this.snapshotSkipTablesInUse()
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
/* Office-email placeholder chips read as normal words, not tiny capitals. */
.placeholder-chip {
  --va-badge-text-transform: none;
  --va-badge-font-size: 0.75rem;
  --va-badge-text-py: 0.125rem;
  --va-badge-text-px: 0.5rem;
  --va-badge-text-wrapper-letter-spacing: normal;
  --va-badge-text-wrapper-font-weight: 600;
}
.day {
  font-size: 12px;
}
.red {
  color: #e42222;
  font-size: 13px;
}
</style>
