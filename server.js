import 'dotenv/config'
import express from 'express'
import fs from 'fs'
import multer from 'multer'
import crypto from 'crypto'
import * as DropboxSign from '@dropbox/sign'
import cors from 'cors'

const upload = multer()
const app = express()

app.use(cors())
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

const PORT = process.env.PORT || 8080

app.get('/', (req, res) => res.send('<h1>Dropbox Sign Webhooks Example</h1>'))

app.get('/sigReqEvents', (req, res) => res.send('<h1>Dropbox Sign Webhooks Example</h1>'))

app.post('/sigReqEvents', upload.none(), (req, res) => {
	// Validation of the event_hash using the SDK
	const callbackData = JSON.parse(req.body.json)
	
	const callbackEvent = DropboxSign.EventCallbackRequest.init(callbackData)

	// Verify that callback came from HelloSign.com
	if (DropboxSign.EventCallbackHelper.isValid(process.env.API_KEY, callbackEvent)) {
		// Send back a successful response
		res.status(200).send('Hello API Event Received')
		
		const eventType = callbackEvent.event.eventType
		console.log(`Event Type: ${eventType}`)
		
		// Download the file if the event is signature_request_downloadable
		// Note: For a completed document, listen for signature_request_all_signed
		if (eventType === 'signature_request_downloadable') {
			const sigReqId = callbackEvent.signatureRequest.signatureRequestId

			const signatureRequestApi = new DropboxSign.SignatureRequestApi()
			signatureRequestApi.username = process.env.API_KEY
			const fileType = 'pdf'

			const result = signatureRequestApi.signatureRequestFiles(sigReqId, fileType)

			result.then(response => {
				fs.createWriteStream(`./downloads/${sigReqId}.pdf`).write(response.body)
			}).catch(error => {
				console.log("Exception when calling Dropbox Sign API:")
				console.log(error.body)
			})
		}
	} else {
		res.status(401).send('Event hash validation failed.')
		console.log('Event hash validation failed.')	
	}

	
	// // Validation of event_hash not using the SDK
	// const event = JSON.parse(req.body.json)
	// const hash = crypto.createHmac('sha256', process.env.API_KEY).update(event.event.event_time + event.event.event_type).digest('hex').toString()
	// if (hash === event.event.event_hash) {
	// 	// Send back a successful response
	// 	res.status(200).send('Hello API Event Received')

	// 	const eventType = event.event.event_type
	// 	console.log(`Event Type: ${eventType}`)

	// 	if (event.event.event_type === 'signature_request_downloadable') {
	// 		const sigReqId = event.signature_request.signature_request_id
			
	// 		// Save the file locally
	// 		const signatureRequestApi = new DropboxSign.SignatureRequestApi()
	// 		signatureRequestApi.username = process.env.API_KEY
	// 		const fileType = "pdf";
			
	// 		const result = signatureRequestApi.signatureRequestFiles(sigReqId, fileType);
			
	// 		result.then(response => {
	// 			fs.createWriteStream(`./downloads/${sigReqId}.pdf`).write(response.body)
	// 		}).catch(error => {
	// 			console.log("Exception when calling Dropbox Sign API:")
	// 			console.log(error.body)
	// 		})
	// 	}
	// } else {
	// 	res.status(401).send('Event hash validation failed.')
	// 	console.log('Event hash validation failed.')
	// }
})

app.listen(PORT, () => {
	console.log(`Listening on PORT: ${PORT}`)
})