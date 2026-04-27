import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ModalController, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  searchOutline,
  businessOutline,
  personOutline,
  callOutline,
  mailOutline,
  locationOutline,
  documentTextOutline,
  cardOutline,
  calendarOutline,
  createOutline,
  closeOutline,
  trashOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  cubeOutline
} from 'ionicons/icons';
import { DistributorService, DistributorDto, DistributorStock } from '../services/distributor.service';
import { SalesHierarchyService, RoleOption } from '../services/sales-hierarchy.service';
import { Toast } from '../services/toast';
import { HapticService } from '../services/haptic.service';

// ============= INDIA STATE / DISTRICT / PINCODE DATA =============
const INDIA_LOCATION_DATA: { [state: string]: { district: string; pincode: string }[] } = {
  'Andhra Pradesh': [
    { district: 'Alluri Sitharama Raju', pincode: '533284' }, { district: 'Anakapalli', pincode: '531001' },
    { district: 'Ananthapuramu', pincode: '515001' }, { district: 'Bapatla', pincode: '522101' },
    { district: 'Chittoor', pincode: '517001' }, { district: 'East Godavari', pincode: '533101' },
    { district: 'Eluru', pincode: '534001' }, { district: 'Guntur', pincode: '522001' },
    { district: 'Kakinada', pincode: '533001' }, { district: 'Konaseema', pincode: '533221' },
    { district: 'Krishna', pincode: '521301' }, { district: 'Kurnool', pincode: '518001' },
    { district: 'Nandyal', pincode: '518501' }, { district: 'NTR', pincode: '520001' },
    { district: 'Prakasam', pincode: '523001' }, { district: 'Sri Potti Sriramulu Nellore', pincode: '524001' },
    { district: 'Srikakulam', pincode: '532001' }, { district: 'Tirupati', pincode: '517501' },
    { district: 'Visakhapatnam', pincode: '530001' }, { district: 'Vizianagaram', pincode: '535001' },
    { district: 'West Godavari', pincode: '534101' }, { district: 'YSR Kadapa', pincode: '516001' },
  ],
  'Arunachal Pradesh': [
    { district: 'Anjaw', pincode: '792101' }, { district: 'Changlang', pincode: '792120' },
    { district: 'Dibang Valley', pincode: '792110' }, { district: 'East Kameng', pincode: '790103' },
    { district: 'East Siang', pincode: '791101' }, { district: 'Itanagar Capital Complex', pincode: '791111' },
    { district: 'Kra Daadi', pincode: '790116' }, { district: 'Kurung Kumey', pincode: '790116' },
    { district: 'Lohit', pincode: '792001' }, { district: 'Longding', pincode: '792131' },
    { district: 'Lower Dibang Valley', pincode: '792001' }, { district: 'Lower Siang', pincode: '791001' },
    { district: 'Lower Subansiri', pincode: '791002' }, { district: 'Namsai', pincode: '792103' },
    { district: 'Papum Pare', pincode: '791102' }, { district: 'Tawang', pincode: '790104' },
    { district: 'Tirap', pincode: '792129' }, { district: 'Upper Dibang Valley', pincode: '792111' },
    { district: 'Upper Siang', pincode: '791103' }, { district: 'Upper Subansiri', pincode: '791120' },
    { district: 'West Kameng', pincode: '790114' }, { district: 'West Siang', pincode: '791001' },
  ],
  'Assam': [
    { district: 'Baksa', pincode: '781372' }, { district: 'Barpeta', pincode: '781301' },
    { district: 'Biswanath', pincode: '784176' }, { district: 'Bongaigaon', pincode: '783380' },
    { district: 'Cachar', pincode: '788001' }, { district: 'Charaideo', pincode: '785690' },
    { district: 'Darrang', pincode: '784125' }, { district: 'Dhemaji', pincode: '787057' },
    { district: 'Dhubri', pincode: '783301' }, { district: 'Dibrugarh', pincode: '786001' },
    { district: 'Dima Hasao', pincode: '788817' }, { district: 'Goalpara', pincode: '783101' },
    { district: 'Golaghat', pincode: '785621' }, { district: 'Hailakandi', pincode: '788151' },
    { district: 'Hojai', pincode: '782435' }, { district: 'Jorhat', pincode: '785001' },
    { district: 'Kamrup', pincode: '781001' }, { district: 'Kamrup Metropolitan', pincode: '781001' },
    { district: 'Karbi Anglong', pincode: '782480' }, { district: 'Karimganj', pincode: '788710' },
    { district: 'Kokrajhar', pincode: '783370' }, { district: 'Lakhimpur', pincode: '787001' },
    { district: 'Majuli', pincode: '785106' }, { district: 'Morigaon', pincode: '782105' },
    { district: 'Nagaon', pincode: '782001' }, { district: 'Nalbari', pincode: '781335' },
    { district: 'Sivasagar', pincode: '785640' }, { district: 'Sonitpur', pincode: '784001' },
    { district: 'Tinsukia', pincode: '786125' }, { district: 'Udalguri', pincode: '784509' },
  ],
  'Bihar': [
    { district: 'Araria', pincode: '854311' }, { district: 'Arwal', pincode: '804401' },
    { district: 'Aurangabad', pincode: '824101' }, { district: 'Banka', pincode: '813102' },
    { district: 'Begusarai', pincode: '851101' }, { district: 'Bhagalpur', pincode: '812001' },
    { district: 'Bhojpur', pincode: '802301' }, { district: 'Buxar', pincode: '802101' },
    { district: 'Darbhanga', pincode: '846001' }, { district: 'East Champaran', pincode: '845401' },
    { district: 'Gaya', pincode: '823001' }, { district: 'Gopalganj', pincode: '841428' },
    { district: 'Jamui', pincode: '811307' }, { district: 'Jehanabad', pincode: '804408' },
    { district: 'Kaimur', pincode: '821101' }, { district: 'Katihar', pincode: '854105' },
    { district: 'Khagaria', pincode: '851204' }, { district: 'Kishanganj', pincode: '855107' },
    { district: 'Lakhisarai', pincode: '811311' }, { district: 'Madhepura', pincode: '852113' },
    { district: 'Madhubani', pincode: '847211' }, { district: 'Munger', pincode: '811201' },
    { district: 'Muzaffarpur', pincode: '842001' }, { district: 'Nalanda', pincode: '803101' },
    { district: 'Nawada', pincode: '805110' }, { district: 'Patna', pincode: '800001' },
    { district: 'Purnia', pincode: '854301' }, { district: 'Rohtas', pincode: '821115' },
    { district: 'Saharsa', pincode: '852201' }, { district: 'Samastipur', pincode: '848101' },
    { district: 'Saran', pincode: '841301' }, { district: 'Sheikhpura', pincode: '811105' },
    { district: 'Sheohar', pincode: '843329' }, { district: 'Sitamarhi', pincode: '843301' },
    { district: 'Siwan', pincode: '841226' }, { district: 'Supaul', pincode: '852131' },
    { district: 'Vaishali', pincode: '844101' }, { district: 'West Champaran', pincode: '845438' },
  ],
  'Chhattisgarh': [
    { district: 'Balod', pincode: '491226' }, { district: 'Baloda Bazar', pincode: '493332' },
    { district: 'Balrampur', pincode: '497119' }, { district: 'Bastar', pincode: '494001' },
    { district: 'Bemetara', pincode: '491335' }, { district: 'Bijapur', pincode: '494444' },
    { district: 'Bilaspur', pincode: '495001' }, { district: 'Dantewada', pincode: '494449' },
    { district: 'Dhamtari', pincode: '493773' }, { district: 'Durg', pincode: '491001' },
    { district: 'Gariaband', pincode: '493889' }, { district: 'Janjgir Champa', pincode: '495671' },
    { district: 'Jashpur', pincode: '496331' }, { district: 'Kabirdham', pincode: '491995' },
    { district: 'Kanker', pincode: '494334' }, { district: 'Kondagaon', pincode: '494226' },
    { district: 'Korba', pincode: '495677' }, { district: 'Koriya', pincode: '497001' },
    { district: 'Mahasamund', pincode: '493445' }, { district: 'Mungeli', pincode: '495334' },
    { district: 'Narayanpur', pincode: '494661' }, { district: 'Raigarh', pincode: '496001' },
    { district: 'Raipur', pincode: '492001' }, { district: 'Rajnandgaon', pincode: '491441' },
    { district: 'Sukma', pincode: '494111' }, { district: 'Surajpur', pincode: '497229' },
    { district: 'Surguja', pincode: '497001' },
  ],
  'Goa': [
    { district: 'North Goa', pincode: '403001' }, { district: 'South Goa', pincode: '403601' },
  ],
  'Gujarat': [
    { district: 'Ahmedabad', pincode: '380001' }, { district: 'Amreli', pincode: '365601' },
    { district: 'Anand', pincode: '388001' }, { district: 'Aravalli', pincode: '383315' },
    { district: 'Banaskantha', pincode: '385001' }, { district: 'Bharuch', pincode: '392001' },
    { district: 'Bhavnagar', pincode: '364001' }, { district: 'Botad', pincode: '364710' },
    { district: 'Chhota Udaipur', pincode: '391165' }, { district: 'Dahod', pincode: '389151' },
    { district: 'Dang', pincode: '394710' }, { district: 'Devbhoomi Dwarka', pincode: '361335' },
    { district: 'Gandhinagar', pincode: '382010' }, { district: 'Gir Somnath', pincode: '362001' },
    { district: 'Jamnagar', pincode: '361001' }, { district: 'Junagadh', pincode: '362001' },
    { district: 'Kheda', pincode: '387001' }, { district: 'Kutch', pincode: '370001' },
    { district: 'Mahisagar', pincode: '389350' }, { district: 'Mehsana', pincode: '384001' },
    { district: 'Morbi', pincode: '363641' }, { district: 'Narmada', pincode: '393130' },
    { district: 'Navsari', pincode: '396445' }, { district: 'Panchmahal', pincode: '389001' },
    { district: 'Patan', pincode: '384265' }, { district: 'Porbandar', pincode: '360575' },
    { district: 'Rajkot', pincode: '360001' }, { district: 'Sabarkantha', pincode: '383001' },
    { district: 'Surat', pincode: '395001' }, { district: 'Surendranagar', pincode: '363001' },
    { district: 'Tapi', pincode: '394641' }, { district: 'Vadodara', pincode: '390001' },
    { district: 'Valsad', pincode: '396001' },
  ],
  'Haryana': [
    { district: 'Ambala', pincode: '134003' }, { district: 'Bhiwani', pincode: '127021' },
    { district: 'Charkhi Dadri', pincode: '127306' }, { district: 'Faridabad', pincode: '121001' },
    { district: 'Fatehabad', pincode: '125050' }, { district: 'Gurugram', pincode: '122001' },
    { district: 'Hisar', pincode: '125001' }, { district: 'Jhajjar', pincode: '124103' },
    { district: 'Jind', pincode: '126102' }, { district: 'Kaithal', pincode: '136027' },
    { district: 'Karnal', pincode: '132001' }, { district: 'Kurukshetra', pincode: '136118' },
    { district: 'Mahendragarh', pincode: '123001' }, { district: 'Palwal', pincode: '121102' },
    { district: 'Panchkula', pincode: '134109' }, { district: 'Panipat', pincode: '132103' },
    { district: 'Rewari', pincode: '123401' }, { district: 'Rohtak', pincode: '124001' },
    { district: 'Sirsa', pincode: '125055' }, { district: 'Sonipat', pincode: '131001' },
    { district: 'Yamunanagar', pincode: '135001' },
  ],
  'Himachal Pradesh': [
    { district: 'Bilaspur', pincode: '174001' }, { district: 'Chamba', pincode: '176310' },
    { district: 'Hamirpur', pincode: '177001' }, { district: 'Kangra', pincode: '176001' },
    { district: 'Kinnaur', pincode: '172107' }, { district: 'Kullu', pincode: '175101' },
    { district: 'Lahaul and Spiti', pincode: '175141' }, { district: 'Mandi', pincode: '175001' },
    { district: 'Shimla', pincode: '171001' }, { district: 'Sirmaur', pincode: '173001' },
    { district: 'Solan', pincode: '173212' }, { district: 'Una', pincode: '174303' },
  ],
  'Jharkhand': [
    { district: 'Bokaro', pincode: '827001' }, { district: 'Chatra', pincode: '825401' },
    { district: 'Deoghar', pincode: '814112' }, { district: 'Dhanbad', pincode: '826001' },
    { district: 'Dumka', pincode: '814101' }, { district: 'East Singhbhum', pincode: '831001' },
    { district: 'Garhwa', pincode: '822114' }, { district: 'Giridih', pincode: '815301' },
    { district: 'Godda', pincode: '814133' }, { district: 'Gumla', pincode: '835207' },
    { district: 'Hazaribagh', pincode: '825301' }, { district: 'Jamtara', pincode: '815351' },
    { district: 'Khunti', pincode: '835210' }, { district: 'Koderma', pincode: '825410' },
    { district: 'Latehar', pincode: '829206' }, { district: 'Lohardaga', pincode: '835302' },
    { district: 'Pakur', pincode: '816107' }, { district: 'Palamu', pincode: '822101' },
    { district: 'Ramgarh', pincode: '829122' }, { district: 'Ranchi', pincode: '834001' },
    { district: 'Sahebganj', pincode: '816109' }, { district: 'Seraikela Kharsawan', pincode: '832401' },
    { district: 'Simdega', pincode: '835223' }, { district: 'West Singhbhum', pincode: '833201' },
  ],
  'Karnataka': [
    { district: 'Bagalkot', pincode: '587101' }, { district: 'Ballari', pincode: '583101' },
    { district: 'Belagavi', pincode: '590001' }, { district: 'Bengaluru Rural', pincode: '562110' },
    { district: 'Bengaluru Urban', pincode: '560001' }, { district: 'Bidar', pincode: '585401' },
    { district: 'Chamarajanagar', pincode: '571313' }, { district: 'Chikkaballapur', pincode: '562101' },
    { district: 'Chikkamagaluru', pincode: '577101' }, { district: 'Chitradurga', pincode: '577501' },
    { district: 'Dakshina Kannada', pincode: '575001' }, { district: 'Davanagere', pincode: '577001' },
    { district: 'Dharwad', pincode: '580001' }, { district: 'Gadag', pincode: '582101' },
    { district: 'Hassan', pincode: '573201' }, { district: 'Haveri', pincode: '581110' },
    { district: 'Kalaburagi', pincode: '585101' }, { district: 'Kodagu', pincode: '571201' },
    { district: 'Kolar', pincode: '563101' }, { district: 'Koppal', pincode: '583231' },
    { district: 'Mandya', pincode: '571401' }, { district: 'Mysuru', pincode: '570001' },
    { district: 'Raichur', pincode: '584101' }, { district: 'Ramanagara', pincode: '562159' },
    { district: 'Shivamogga', pincode: '577201' }, { district: 'Tumakuru', pincode: '572101' },
    { district: 'Udupi', pincode: '576101' }, { district: 'Uttara Kannada', pincode: '581301' },
    { district: 'Vijayapura', pincode: '586101' }, { district: 'Yadgir', pincode: '585201' },
  ],
  'Kerala': [
    { district: 'Alappuzha', pincode: '688001' }, { district: 'Ernakulam', pincode: '682001' },
    { district: 'Idukki', pincode: '685602' }, { district: 'Kannur', pincode: '670001' },
    { district: 'Kasaragod', pincode: '671121' }, { district: 'Kollam', pincode: '691001' },
    { district: 'Kottayam', pincode: '686001' }, { district: 'Kozhikode', pincode: '673001' },
    { district: 'Malappuram', pincode: '676501' }, { district: 'Palakkad', pincode: '678001' },
    { district: 'Pathanamthitta', pincode: '689645' }, { district: 'Thiruvananthapuram', pincode: '695001' },
    { district: 'Thrissur', pincode: '680001' }, { district: 'Wayanad', pincode: '673121' },
  ],
  'Madhya Pradesh': [
    { district: 'Agar Malwa', pincode: '465441' }, { district: 'Alirajpur', pincode: '457887' },
    { district: 'Anuppur', pincode: '484224' }, { district: 'Ashoknagar', pincode: '473331' },
    { district: 'Balaghat', pincode: '481001' }, { district: 'Barwani', pincode: '451551' },
    { district: 'Betul', pincode: '460001' }, { district: 'Bhind', pincode: '477001' },
    { district: 'Bhopal', pincode: '462001' }, { district: 'Burhanpur', pincode: '450331' },
    { district: 'Chhatarpur', pincode: '471001' }, { district: 'Chhindwara', pincode: '480001' },
    { district: 'Damoh', pincode: '470661' }, { district: 'Datia', pincode: '475661' },
    { district: 'Dewas', pincode: '455001' }, { district: 'Dhar', pincode: '454001' },
    { district: 'Dindori', pincode: '481880' }, { district: 'Guna', pincode: '473001' },
    { district: 'Gwalior', pincode: '474001' }, { district: 'Harda', pincode: '461331' },
    { district: 'Indore', pincode: '452001' }, { district: 'Jabalpur', pincode: '482001' },
    { district: 'Jhabua', pincode: '457661' }, { district: 'Katni', pincode: '483501' },
    { district: 'Khandwa', pincode: '450001' }, { district: 'Khargone', pincode: '451001' },
    { district: 'Mandla', pincode: '481661' }, { district: 'Mandsaur', pincode: '458001' },
    { district: 'Morena', pincode: '476001' }, { district: 'Narsinghpur', pincode: '487221' },
    { district: 'Neemuch', pincode: '458441' }, { district: 'Niwari', pincode: '472001' },
    { district: 'Panna', pincode: '488001' }, { district: 'Raisen', pincode: '464551' },
    { district: 'Rajgarh', pincode: '465661' }, { district: 'Ratlam', pincode: '457001' },
    { district: 'Rewa', pincode: '486001' }, { district: 'Sagar', pincode: '470001' },
    { district: 'Satna', pincode: '485001' }, { district: 'Sehore', pincode: '466001' },
    { district: 'Seoni', pincode: '480661' }, { district: 'Shahdol', pincode: '484001' },
    { district: 'Shajapur', pincode: '465001' }, { district: 'Sheopur', pincode: '476337' },
    { district: 'Shivpuri', pincode: '473551' }, { district: 'Sidhi', pincode: '486771' },
    { district: 'Singrauli', pincode: '486886' }, { district: 'Tikamgarh', pincode: '472001' },
    { district: 'Ujjain', pincode: '456001' }, { district: 'Umaria', pincode: '484661' },
    { district: 'Vidisha', pincode: '464001' },
  ],
  'Maharashtra': [
    { district: 'Ahmednagar', pincode: '414001' }, { district: 'Akola', pincode: '444001' },
    { district: 'Amravati', pincode: '444601' }, { district: 'Aurangabad', pincode: '431001' },
    { district: 'Beed', pincode: '431122' }, { district: 'Bhandara', pincode: '441904' },
    { district: 'Buldhana', pincode: '443001' }, { district: 'Chandrapur', pincode: '442401' },
    { district: 'Dhule', pincode: '424001' }, { district: 'Gadchiroli', pincode: '442605' },
    { district: 'Gondia', pincode: '441601' }, { district: 'Hingoli', pincode: '431513' },
    { district: 'Jalgaon', pincode: '425001' }, { district: 'Jalna', pincode: '431203' },
    { district: 'Kolhapur', pincode: '416001' }, { district: 'Latur', pincode: '413512' },
    { district: 'Mumbai City', pincode: '400001' }, { district: 'Mumbai Suburban', pincode: '400050' },
    { district: 'Nagpur', pincode: '440001' }, { district: 'Nanded', pincode: '431601' },
    { district: 'Nandurbar', pincode: '425412' }, { district: 'Nashik', pincode: '422001' },
    { district: 'Osmanabad', pincode: '413501' }, { district: 'Palghar', pincode: '401404' },
    { district: 'Parbhani', pincode: '431401' }, { district: 'Pune', pincode: '411001' },
    { district: 'Raigad', pincode: '402201' }, { district: 'Ratnagiri', pincode: '415612' },
    { district: 'Sangli', pincode: '416416' }, { district: 'Satara', pincode: '415001' },
    { district: 'Sindhudurg', pincode: '416520' }, { district: 'Solapur', pincode: '413001' },
    { district: 'Thane', pincode: '400601' }, { district: 'Washim', pincode: '444505' },
    { district: 'Wardha', pincode: '442001' }, { district: 'Yavatmal', pincode: '445001' },
  ],
  'Manipur': [
    { district: 'Bishnupur', pincode: '795126' }, { district: 'Chandel', pincode: '795107' },
    { district: 'Churachandpur', pincode: '795128' }, { district: 'Imphal East', pincode: '795001' },
    { district: 'Imphal West', pincode: '795001' }, { district: 'Jiribam', pincode: '795106' },
    { district: 'Kakching', pincode: '795103' }, { district: 'Kangpokpi', pincode: '795116' },
    { district: 'Senapati', pincode: '795106' }, { district: 'Tamenglong', pincode: '795141' },
    { district: 'Thoubal', pincode: '795138' }, { district: 'Ukhrul', pincode: '795142' },
  ],
  'Meghalaya': [
    { district: 'East Garo Hills', pincode: '794001' }, { district: 'East Jaintia Hills', pincode: '793150' },
    { district: 'East Khasi Hills', pincode: '793001' }, { district: 'North Garo Hills', pincode: '794111' },
    { district: 'Ri Bhoi', pincode: '793101' }, { district: 'South Garo Hills', pincode: '794103' },
    { district: 'South West Khasi Hills', pincode: '793119' }, { district: 'West Garo Hills', pincode: '794101' },
    { district: 'West Jaintia Hills', pincode: '793150' }, { district: 'West Khasi Hills', pincode: '793119' },
  ],
  'Mizoram': [
    { district: 'Aizawl', pincode: '796001' }, { district: 'Champhai', pincode: '796321' },
    { district: 'Hnahthial', pincode: '796161' }, { district: 'Kolasib', pincode: '796081' },
    { district: 'Lawngtlai', pincode: '796891' }, { district: 'Lunglei', pincode: '796701' },
    { district: 'Mamit', pincode: '796441' }, { district: 'Saitual', pincode: '796005' },
    { district: 'Serchhip', pincode: '796181' }, { district: 'Siaha', pincode: '796901' },
  ],
  'Nagaland': [
    { district: 'Dimapur', pincode: '797112' }, { district: 'Kiphire', pincode: '798621' },
    { district: 'Kohima', pincode: '797001' }, { district: 'Longleng', pincode: '798980' },
    { district: 'Mokokchung', pincode: '798601' }, { district: 'Mon', pincode: '798621' },
    { district: 'Peren', pincode: '797106' }, { district: 'Phek', pincode: '797111' },
    { district: 'Tuensang', pincode: '798612' }, { district: 'Wokha', pincode: '797111' },
    { district: 'Zunheboto', pincode: '798620' },
  ],
  'Odisha': [
    { district: 'Angul', pincode: '759100' }, { district: 'Balangir', pincode: '767001' },
    { district: 'Balasore', pincode: '756001' }, { district: 'Bargarh', pincode: '768028' },
    { district: 'Bhadrak', pincode: '756100' }, { district: 'Boudh', pincode: '762014' },
    { district: 'Cuttack', pincode: '753001' }, { district: 'Deogarh', pincode: '768108' },
    { district: 'Dhenkanal', pincode: '759001' }, { district: 'Gajapati', pincode: '761200' },
    { district: 'Ganjam', pincode: '760001' }, { district: 'Jagatsinghpur', pincode: '754103' },
    { district: 'Jajpur', pincode: '755001' }, { district: 'Jharsuguda', pincode: '768201' },
    { district: 'Kalahandi', pincode: '766001' }, { district: 'Kandhamal', pincode: '762001' },
    { district: 'Kendrapara', pincode: '754211' }, { district: 'Kendujhar', pincode: '758001' },
    { district: 'Khordha', pincode: '752050' }, { district: 'Koraput', pincode: '764020' },
    { district: 'Malkangiri', pincode: '764045' }, { district: 'Mayurbhanj', pincode: '757001' },
    { district: 'Nabarangpur', pincode: '764059' }, { district: 'Nayagarh', pincode: '752069' },
    { district: 'Nuapada', pincode: '766105' }, { district: 'Puri', pincode: '752001' },
    { district: 'Rayagada', pincode: '765001' }, { district: 'Sambalpur', pincode: '768001' },
    { district: 'Subarnapur', pincode: '767017' }, { district: 'Sundargarh', pincode: '770001' },
  ],
  'Punjab': [
    { district: 'Amritsar', pincode: '143001' }, { district: 'Barnala', pincode: '148101' },
    { district: 'Bathinda', pincode: '151001' }, { district: 'Faridkot', pincode: '151203' },
    { district: 'Fatehgarh Sahib', pincode: '140407' }, { district: 'Fazilka', pincode: '152123' },
    { district: 'Firozepur', pincode: '152001' }, { district: 'Gurdaspur', pincode: '143521' },
    { district: 'Hoshiarpur', pincode: '146001' }, { district: 'Jalandhar', pincode: '144001' },
    { district: 'Kapurthala', pincode: '144601' }, { district: 'Ludhiana', pincode: '141001' },
    { district: 'Malerkotla', pincode: '148023' }, { district: 'Mansa', pincode: '151505' },
    { district: 'Moga', pincode: '142001' }, { district: 'Mohali', pincode: '160062' },
    { district: 'Muktsar', pincode: '152026' }, { district: 'Nawanshahr', pincode: '144514' },
    { district: 'Pathankot', pincode: '145001' }, { district: 'Patiala', pincode: '147001' },
    { district: 'Rupnagar', pincode: '140001' }, { district: 'Sangrur', pincode: '148001' },
    { district: 'Tarn Taran', pincode: '143401' },
  ],
  'Rajasthan': [
    { district: 'Ajmer', pincode: '305001' }, { district: 'Alwar', pincode: '301001' },
    { district: 'Banswara', pincode: '327001' }, { district: 'Baran', pincode: '325205' },
    { district: 'Barmer', pincode: '344001' }, { district: 'Bharatpur', pincode: '321001' },
    { district: 'Bhilwara', pincode: '311001' }, { district: 'Bikaner', pincode: '334001' },
    { district: 'Bundi', pincode: '323001' }, { district: 'Chittorgarh', pincode: '312001' },
    { district: 'Churu', pincode: '331001' }, { district: 'Dausa', pincode: '303303' },
    { district: 'Dholpur', pincode: '328001' }, { district: 'Dungarpur', pincode: '314001' },
    { district: 'Ganganagar', pincode: '335001' }, { district: 'Hanumangarh', pincode: '335513' },
    { district: 'Jaipur', pincode: '302001' }, { district: 'Jaisalmer', pincode: '345001' },
    { district: 'Jalore', pincode: '343001' }, { district: 'Jhalawar', pincode: '326001' },
    { district: 'Jhunjhunu', pincode: '333001' }, { district: 'Jodhpur', pincode: '342001' },
    { district: 'Karauli', pincode: '322241' }, { district: 'Kota', pincode: '324001' },
    { district: 'Nagaur', pincode: '341001' }, { district: 'Pali', pincode: '306401' },
    { district: 'Pratapgarh', pincode: '312605' }, { district: 'Rajsamand', pincode: '313324' },
    { district: 'Sawai Madhopur', pincode: '322001' }, { district: 'Sikar', pincode: '332001' },
    { district: 'Sirohi', pincode: '307001' }, { district: 'Tonk', pincode: '304001' },
    { district: 'Udaipur', pincode: '313001' },
  ],
  'Sikkim': [
    { district: 'East Sikkim', pincode: '737101' }, { district: 'North Sikkim', pincode: '737120' },
    { district: 'South Sikkim', pincode: '737111' }, { district: 'West Sikkim', pincode: '737121' },
  ],
  'Tamil Nadu': [
    { district: 'Ariyalur', pincode: '621704' }, { district: 'Chengalpattu', pincode: '603001' },
    { district: 'Chennai', pincode: '600001' }, { district: 'Coimbatore', pincode: '641001' },
    { district: 'Cuddalore', pincode: '607001' }, { district: 'Dharmapuri', pincode: '636701' },
    { district: 'Dindigul', pincode: '624001' }, { district: 'Erode', pincode: '638001' },
    { district: 'Kallakurichi', pincode: '606202' }, { district: 'Kancheepuram', pincode: '631501' },
    { district: 'Kanyakumari', pincode: '629001' }, { district: 'Karur', pincode: '639001' },
    { district: 'Krishnagiri', pincode: '635001' }, { district: 'Madurai', pincode: '625001' },
    { district: 'Mayiladuthurai', pincode: '609001' }, { district: 'Nagapattinam', pincode: '611001' },
    { district: 'Namakkal', pincode: '637001' }, { district: 'Nilgiris', pincode: '643001' },
    { district: 'Perambalur', pincode: '621212' }, { district: 'Pudukkottai', pincode: '622001' },
    { district: 'Ramanathapuram', pincode: '623501' }, { district: 'Ranipet', pincode: '632401' },
    { district: 'Salem', pincode: '636001' }, { district: 'Sivaganga', pincode: '630561' },
    { district: 'Tenkasi', pincode: '627811' }, { district: 'Thanjavur', pincode: '613001' },
    { district: 'Theni', pincode: '625531' }, { district: 'Thoothukudi', pincode: '628001' },
    { district: 'Tiruchirappalli', pincode: '620001' }, { district: 'Tirunelveli', pincode: '627001' },
    { district: 'Tirupathur', pincode: '635601' }, { district: 'Tiruppur', pincode: '641601' },
    { district: 'Tiruvallur', pincode: '602001' }, { district: 'Tiruvannamalai', pincode: '606601' },
    { district: 'Tiruvarur', pincode: '610001' }, { district: 'Vellore', pincode: '632001' },
    { district: 'Viluppuram', pincode: '605602' }, { district: 'Virudhunagar', pincode: '626001' },
  ],
  'Telangana': [
    { district: 'Adilabad', pincode: '504001' }, { district: 'Bhadradri Kothagudem', pincode: '507101' },
    { district: 'Hanumakonda', pincode: '506001' }, { district: 'Hyderabad', pincode: '500001' },
    { district: 'Jagtial', pincode: '505327' }, { district: 'Jangaon', pincode: '506167' },
    { district: 'Jayashankar Bhupalpally', pincode: '506169' }, { district: 'Jogulamba Gadwal', pincode: '509125' },
    { district: 'Kamareddy', pincode: '503111' }, { district: 'Karimnagar', pincode: '505001' },
    { district: 'Khammam', pincode: '507001' }, { district: 'Kumuram Bheem Asifabad', pincode: '504293' },
    { district: 'Mahabubabad', pincode: '506101' }, { district: 'Mahabubnagar', pincode: '509001' },
    { district: 'Mancherial', pincode: '504208' }, { district: 'Medak', pincode: '502110' },
    { district: 'Medchal Malkajgiri', pincode: '501401' }, { district: 'Mulugu', pincode: '506343' },
    { district: 'Nagarkurnool', pincode: '509209' }, { district: 'Nalgonda', pincode: '508001' },
    { district: 'Narayanpet', pincode: '509210' }, { district: 'Nirmal', pincode: '504106' },
    { district: 'Nizamabad', pincode: '503001' }, { district: 'Peddapalli', pincode: '505172' },
    { district: 'Rajanna Sircilla', pincode: '505301' }, { district: 'Ranga Reddy', pincode: '500075' },
    { district: 'Sangareddy', pincode: '502001' }, { district: 'Siddipet', pincode: '502103' },
    { district: 'Suryapet', pincode: '508213' }, { district: 'Vikarabad', pincode: '501101' },
    { district: 'Wanaparthy', pincode: '509103' }, { district: 'Warangal', pincode: '506002' },
    { district: 'Yadadri Bhuvanagiri', pincode: '508116' },
  ],
  'Tripura': [
    { district: 'Dhalai', pincode: '799264' }, { district: 'Gomati', pincode: '799150' },
    { district: 'Khowai', pincode: '799201' }, { district: 'North Tripura', pincode: '799270' },
    { district: 'Sepahijala', pincode: '799102' }, { district: 'South Tripura', pincode: '799001' },
    { district: 'Unakoti', pincode: '799289' }, { district: 'West Tripura', pincode: '799001' },
  ],
  'Uttar Pradesh': [
    { district: 'Agra', pincode: '282001' }, { district: 'Aligarh', pincode: '202001' },
    { district: 'Ambedkar Nagar', pincode: '224122' }, { district: 'Amethi', pincode: '227405' },
    { district: 'Amroha', pincode: '244221' }, { district: 'Auraiya', pincode: '206122' },
    { district: 'Ayodhya', pincode: '224001' }, { district: 'Azamgarh', pincode: '276001' },
    { district: 'Baghpat', pincode: '250609' }, { district: 'Bahraich', pincode: '271801' },
    { district: 'Ballia', pincode: '277001' }, { district: 'Balrampur', pincode: '271201' },
    { district: 'Banda', pincode: '210001' }, { district: 'Barabanki', pincode: '225001' },
    { district: 'Bareilly', pincode: '243001' }, { district: 'Basti', pincode: '272001' },
    { district: 'Bhadohi', pincode: '221401' }, { district: 'Bijnor', pincode: '246701' },
    { district: 'Budaun', pincode: '243601' }, { district: 'Bulandshahr', pincode: '203001' },
    { district: 'Chandauli', pincode: '232104' }, { district: 'Chitrakoot', pincode: '210205' },
    { district: 'Deoria', pincode: '274001' }, { district: 'Etah', pincode: '207001' },
    { district: 'Etawah', pincode: '206001' }, { district: 'Farrukhabad', pincode: '209625' },
    { district: 'Fatehpur', pincode: '212601' }, { district: 'Firozabad', pincode: '283203' },
    { district: 'Gautam Buddh Nagar', pincode: '201301' }, { district: 'Ghaziabad', pincode: '201001' },
    { district: 'Ghazipur', pincode: '233001' }, { district: 'Gonda', pincode: '271001' },
    { district: 'Gorakhpur', pincode: '273001' }, { district: 'Hamirpur', pincode: '210301' },
    { district: 'Hapur', pincode: '245101' }, { district: 'Hardoi', pincode: '241001' },
    { district: 'Hathras', pincode: '204101' }, { district: 'Jalaun', pincode: '285001' },
    { district: 'Jaunpur', pincode: '222001' }, { district: 'Jhansi', pincode: '284001' },
    { district: 'Kannauj', pincode: '209726' }, { district: 'Kanpur Dehat', pincode: '209304' },
    { district: 'Kanpur Nagar', pincode: '208001' }, { district: 'Kasganj', pincode: '207123' },
    { district: 'Kaushambi', pincode: '212201' }, { district: 'Kheri', pincode: '262701' },
    { district: 'Kushinagar', pincode: '274403' }, { district: 'Lalitpur', pincode: '284403' },
    { district: 'Lucknow', pincode: '226001' }, { district: 'Maharajganj', pincode: '273303' },
    { district: 'Mahoba', pincode: '210427' }, { district: 'Mainpuri', pincode: '205001' },
    { district: 'Mathura', pincode: '281001' }, { district: 'Mau', pincode: '275101' },
    { district: 'Meerut', pincode: '250001' }, { district: 'Mirzapur', pincode: '231001' },
    { district: 'Moradabad', pincode: '244001' }, { district: 'Muzaffarnagar', pincode: '251001' },
    { district: 'Pilibhit', pincode: '262001' }, { district: 'Pratapgarh', pincode: '230001' },
    { district: 'Prayagraj', pincode: '211001' }, { district: 'Rae Bareli', pincode: '229001' },
    { district: 'Rampur', pincode: '244901' }, { district: 'Saharanpur', pincode: '247001' },
    { district: 'Sambhal', pincode: '244302' }, { district: 'Sant Kabir Nagar', pincode: '272175' },
    { district: 'Shahjahanpur', pincode: '242001' }, { district: 'Shamli', pincode: '247776' },
    { district: 'Shravasti', pincode: '271831' }, { district: 'Siddharthnagar', pincode: '272207' },
    { district: 'Sitapur', pincode: '261001' }, { district: 'Sonbhadra', pincode: '231216' },
    { district: 'Sultanpur', pincode: '228001' }, { district: 'Unnao', pincode: '209801' },
    { district: 'Varanasi', pincode: '221001' },
  ],
  'Uttarakhand': [
    { district: 'Almora', pincode: '263601' }, { district: 'Bageshwar', pincode: '263642' },
    { district: 'Chamoli', pincode: '246401' }, { district: 'Champawat', pincode: '262523' },
    { district: 'Dehradun', pincode: '248001' }, { district: 'Haridwar', pincode: '249401' },
    { district: 'Nainital', pincode: '263001' }, { district: 'Pauri Garhwal', pincode: '246001' },
    { district: 'Pithoragarh', pincode: '262501' }, { district: 'Rudraprayag', pincode: '246171' },
    { district: 'Tehri Garhwal', pincode: '249001' }, { district: 'Udam Singh Nagar', pincode: '263153' },
    { district: 'Uttarkashi', pincode: '249193' },
  ],
  'West Bengal': [
    { district: 'Alipurduar', pincode: '736121' }, { district: 'Bankura', pincode: '722101' },
    { district: 'Birbhum', pincode: '731101' }, { district: 'Cooch Behar', pincode: '736101' },
    { district: 'Dakshin Dinajpur', pincode: '733121' }, { district: 'Darjeeling', pincode: '734101' },
    { district: 'Hooghly', pincode: '712101' }, { district: 'Howrah', pincode: '711101' },
    { district: 'Jalpaiguri', pincode: '735101' }, { district: 'Jhargram', pincode: '721507' },
    { district: 'Kalimpong', pincode: '734301' }, { district: 'Kolkata', pincode: '700001' },
    { district: 'Malda', pincode: '732101' }, { district: 'Murshidabad', pincode: '742101' },
    { district: 'Nadia', pincode: '741101' }, { district: 'North 24 Parganas', pincode: '700101' },
    { district: 'Paschim Bardhaman', pincode: '713101' }, { district: 'Paschim Medinipur', pincode: '721101' },
    { district: 'Purba Bardhaman', pincode: '713101' }, { district: 'Purba Medinipur', pincode: '721401' },
    { district: 'Purulia', pincode: '723101' }, { district: 'South 24 Parganas', pincode: '700001' },
    { district: 'Uttar Dinajpur', pincode: '733201' },
  ],
  // Union Territories
  'Andaman and Nicobar Islands': [
    { district: 'Nicobar', pincode: '744301' }, { district: 'North and Middle Andaman', pincode: '744204' },
    { district: 'South Andaman', pincode: '744101' },
  ],
  'Chandigarh': [
    { district: 'Chandigarh', pincode: '160001' },
  ],
  'Dadra and Nagar Haveli and Daman and Diu': [
    { district: 'Dadra and Nagar Haveli', pincode: '396230' }, { district: 'Daman', pincode: '396210' },
    { district: 'Diu', pincode: '362520' },
  ],
  'Delhi': [
    { district: 'Central Delhi', pincode: '110001' }, { district: 'East Delhi', pincode: '110091' },
    { district: 'New Delhi', pincode: '110001' }, { district: 'North Delhi', pincode: '110007' },
    { district: 'North East Delhi', pincode: '110094' }, { district: 'North West Delhi', pincode: '110035' },
    { district: 'Shahdara', pincode: '110032' }, { district: 'South Delhi', pincode: '110001' },
    { district: 'South East Delhi', pincode: '110025' }, { district: 'South West Delhi', pincode: '110037' },
    { district: 'West Delhi', pincode: '110018' },
  ],
  'Jammu and Kashmir': [
    { district: 'Anantnag', pincode: '192101' }, { district: 'Bandipora', pincode: '193502' },
    { district: 'Baramulla', pincode: '193101' }, { district: 'Budgam', pincode: '191111' },
    { district: 'Doda', pincode: '182202' }, { district: 'Ganderbal', pincode: '191201' },
    { district: 'Jammu', pincode: '180001' }, { district: 'Kathua', pincode: '184101' },
    { district: 'Kishtwar', pincode: '182204' }, { district: 'Kulgam', pincode: '192231' },
    { district: 'Kupwara', pincode: '193222' }, { district: 'Poonch', pincode: '185101' },
    { district: 'Pulwama', pincode: '192301' }, { district: 'Rajouri', pincode: '185131' },
    { district: 'Ramban', pincode: '182143' }, { district: 'Reasi', pincode: '182311' },
    { district: 'Samba', pincode: '184121' }, { district: 'Shopian', pincode: '192303' },
    { district: 'Srinagar', pincode: '190001' }, { district: 'Udhampur', pincode: '182101' },
  ],
  'Ladakh': [
    { district: 'Kargil', pincode: '194103' }, { district: 'Leh', pincode: '194101' },
  ],
  'Lakshadweep': [
    { district: 'Lakshadweep', pincode: '682555' },
  ],
  'Puducherry': [
    { district: 'Karaikal', pincode: '609601' }, { district: 'Mahe', pincode: '673310' },
    { district: 'Puducherry', pincode: '605001' }, { district: 'Yanam', pincode: '533464' },
  ],
};

interface Distributor {
  id: string;
  name: string;
  companyName?: string;
  assignedPerson: string;
  salesPersonRoleType?: string;
  salespersonId?: number;
  distributorType: string;
  distributorCode?: string;
  companyType: string;
  email: string;
  contact: string;
  alternateContact?: string;
  address: string;
  state?: string;
  district?: string;
  pinCode?: string;
  aadhaarNumber: string;
  panNumber: string;
  gstNumber: string;
  status?: string;
  isActive?: boolean;
  creditLimit?: boolean;
  creditAmount?: number;
  bankGuaranteeNumber?: string;
  bgExpiryDate?: string;
  username?: string;
  password?: string;
  accountNumber?: string;
  ifsc?: string;
  accountName?: string;
  createdAt: string;
}

@Component({
  selector: 'app-distributor',
  templateUrl: './distributor.page.html',
  styleUrls: ['./distributor.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
  ],
  standalone: true,
})
export class DistributorPage implements OnInit {
  distributors: Distributor[] = [];
  filteredDistributors: Distributor[] = [];
  searchQuery: string = '';
  salesPersons: any[] = [];
  roles = [
    { value: 'NATIONAL_SALES_MGR', label: 'National Sales Manager' },
    { value: 'STATE_SALES_MGR', label: 'State Sales Manager' },
    { value: 'ZONAL_SALES_MGR', label: 'Zonal Sales Manager' },
    { value: 'REGIONAL_SALES_MGR', label: 'Regional Sales Manager' },
    { value: 'AREA_SALES_MGR', label: 'Area Sales Manager' },
    { value: 'SALES_OFFICER', label: 'Sales Officer' },
    { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
  ];

  // Role options from API
  roleOptions: RoleOption[] = [];
  isLoadingRoles: boolean = false;

  // Key person dropdown
  keyPersonsList: any[] = [];
  isLoadingKeyPersons: boolean = false;

  // Location data
  readonly stateOptions = Object.keys(INDIA_LOCATION_DATA).sort();
  filteredDistricts: { district: string; pincode: string }[] = [];

  // Modal states
  showAddModal: boolean = false;
  showDetailsModal: boolean = false;
  showDeleteConfirmModal: boolean = false;
  isEditing: boolean = false;
  selectedDistributor: Distributor | null = null;

  distributorForm!: FormGroup;

  // Stats
  totalDistributors: number = 0;
  totalAssignedPersons: number = 0;
  totalDistributorTypes: number = 0;

  // Loading state
  isLoading: boolean = false;

  // Stock state
  distributorStock: DistributorStock | null = null;
  isLoadingStock: boolean = false;

  // Editing state
  editingSalesPersonRoleType: string = '';
  
  // Password visibility toggle
  showPassword: boolean = false;

  private haptic = inject(HapticService);

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private distributorService: DistributorService,
    private salesHierarchyService: SalesHierarchyService,
    private cdr: ChangeDetectorRef,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private toast: Toast
  ) {
    // Register icons
    addIcons({
      'add-outline': addOutline,
      'search-outline': searchOutline,
      'business-outline': businessOutline,
      'person-outline': personOutline,
      'call-outline': callOutline,
      'mail-outline': mailOutline,
      'location-outline': locationOutline,
      'document-text-outline': documentTextOutline,
      'card-outline': cardOutline,
      'calendar-outline': calendarOutline,
      'create-outline': createOutline,
      'close-outline': closeOutline,
      'trash-outline': trashOutline,
      'lock-closed-outline': lockClosedOutline,
      'eye-outline': eyeOutline,
      'eye-off-outline': eyeOffOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'close-circle-outline': closeCircleOutline,
      'cube-outline': cubeOutline
    });
  }

  ngOnInit() {
    this.initializeForm();
    this.loadRoleOptions();
    this.fetchSalesPersons();
    this.fetchDistributors();
    this.setupFormValueChanges();
  }

  loadRoleOptions() {
    this.isLoadingRoles = true;
    this.salesHierarchyService.getRolesDropdown().subscribe({
      next: (opts) => {
        this.roleOptions = opts;
        this.isLoadingRoles = false;
      },
      error: () => {
        // fallback: keep empty, user won't see options until API recovers
        this.isLoadingRoles = false;
      }
    });
  }

  // Setup listener for assignedPerson field changes
  setupFormValueChanges() {
    this.distributorForm.get('assignedPerson')?.valueChanges.subscribe((role: string) => {
      if (role) {
        this.fetchKeyPersonsByRole(role);
      } else {
        this.keyPersonsList = [];
      }
    });

    this.distributorForm.get('state')?.valueChanges.subscribe((state: string) => {
      this.filteredDistricts = state ? (INDIA_LOCATION_DATA[state] || []) : [];
      this.distributorForm.patchValue({ district: '', pincode: '' }, { emitEvent: false });
    });

    this.distributorForm.get('district')?.valueChanges.subscribe((district: string) => {
      const found = this.filteredDistricts.find(d => d.district === district);
      if (found) {
        this.distributorForm.patchValue({ pincode: found.pincode }, { emitEvent: false });
      }
    });
  }

  onPincodeInput(event: any) {
    const pincode = (event.detail?.value ?? '').toString().replace(/\D/g, '');
    if (pincode.length === 6) {
      const result = this.findLocationByPincode(pincode);
      if (result) {
        this.filteredDistricts = INDIA_LOCATION_DATA[result.state] || [];
        this.distributorForm.patchValue(
          { state: result.state, district: result.district },
          { emitEvent: false }
        );
      }
    } else if (pincode.length === 0) {
      this.filteredDistricts = [];
      this.distributorForm.patchValue({ state: '', district: '' }, { emitEvent: false });
    }
  }

  private findLocationByPincode(pincode: string): { state: string; district: string } | null {
    for (const state of Object.keys(INDIA_LOCATION_DATA)) {
      const match = INDIA_LOCATION_DATA[state].find(d => d.pincode === pincode);
      if (match) return { state, district: match.district };
    }
    for (const state of Object.keys(INDIA_LOCATION_DATA)) {
      const match = INDIA_LOCATION_DATA[state].find(d => d.pincode.startsWith(pincode.substring(0, 4)));
      if (match) return { state, district: match.district };
    }
    for (const state of Object.keys(INDIA_LOCATION_DATA)) {
      const match = INDIA_LOCATION_DATA[state].find(d => d.pincode.startsWith(pincode.substring(0, 3)));
      if (match) return { state, district: match.district };
    }
    return null;
  }

  // Fetch key persons from API based on selected role
  fetchKeyPersonsByRole(role: string) {
    console.log('🔄 Fetching key persons for role:', role);
    this.isLoadingKeyPersons = true;

    this.distributorService.getKeyPersonsByRole(role).subscribe({
      next: (response: any) => {
        console.log('✅ Key persons fetched:', response);
        // Check if response is an array directly or wrapped in data property
        this.keyPersonsList = Array.isArray(response) ? response : (response?.data || []);
        this.isLoadingKeyPersons = false;
      },
      error: (err) => {
        console.error('❌ Failed to fetch key persons', err);
        this.keyPersonsList = [];
        this.isLoadingKeyPersons = false;
      }
    });
  }

  initializeForm() {
    this.distributorForm = this.fb.group({
      companyName: ['', [Validators.required]],
      assignedPerson: ['', [Validators.required]],
      keyPerson: [''],
      distributorType: ['', [Validators.required]],
      companyType: ['', [Validators.required]],
      isActive: [true],
      email: ['', [Validators.required, Validators.email]],
      contact: ['', [Validators.required, Validators.minLength(10)]],
      alternateContact: [''],
      address: ['', [Validators.required]],
      aadhaarNumber: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(12)]],
      panNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(10)]],
      gstNumber: ['', [Validators.minLength(15), Validators.maxLength(15)]],
      creditLimit: [false],
      username: [''],
      password: [''],
      accountNumber: [''],
      ifsc: [''],
      accountName: [''],
      keyPersonName: [''],
      bankGuaranteeNumber: [''],
      creditAmount: [''],
      bankGuaranteeExpiryDate: [''],
      state: [''],
      district: [''],
      pincode: ['']
    });
  }

  // Helper method to map DTO to UI model
  private mapDtoToDistributor(dto: DistributorDto): Distributor {
    return {
      id: dto.id.toString(),
      name: dto.name || (dto.firmName || '') || '',
      companyName: dto.companyName || dto.name || (dto.firmName || '') || '',
      assignedPerson: dto.assignedPerson || '',
      salesPersonRoleType: dto.salesPersonRoleType || '',
      salespersonId: dto.salespersonId,
      distributorType: dto.distributorType,
      distributorCode: dto.distributorCode || '',
      companyType: dto.companyType,
      email: dto.contactEmail,
      contact: dto.phoneNumber,
      alternateContact: dto.alternateContact || '',
      address: dto.address,
      state: dto.state || '',
      district: dto.district || '',
      pinCode: dto.pinCode || '',
      aadhaarNumber: dto.aadhaarNumber,
      panNumber: dto.panNumber,
      gstNumber: dto.gstNumber,
      status: dto.status,
      isActive: dto.status === 'ACTIVE' || dto.status === undefined || dto.status === null,
      creditLimit: dto.creditLimit || false,
      creditAmount: dto.creditAmount,
      bankGuaranteeNumber: dto.bankGuaranteeNumber || '',
      bgExpiryDate: dto.bgExpiryDate || '',
      accountNumber: dto.accountNumber || '',
      ifsc: dto.ifsc || '',
      accountName: dto.accountName || '',
      username: dto.username || '',
      password: dto.password || '',
      createdAt: dto.createdOn
    };
  }

  // Helper method to map form data to API payload
  private mapFormToPayload(formData: any) {
    const selectedKeyPerson = this.keyPersonsList.find(person => person.id === formData.keyPerson);

    // salesPersonRoleType always comes from the role dropdown (assignedPerson field)
    const salesPersonRoleType = formData.assignedPerson || '';

    // Get the key person's actual name
    const assignedPersonName = selectedKeyPerson
      ? (selectedKeyPerson.firstName + ' ' + selectedKeyPerson.lastName).trim()
      : '';

    const payload = {
      companyName: formData.companyName || '',
      firmName: formData.companyName || '',
      name: formData.companyName || '',
      salesPersonRoleType: salesPersonRoleType,
      salespersonId: formData.keyPerson || 0,
      assignedPerson: assignedPersonName || '',
      distributorType: formData.distributorType,
      companyType: formData.companyType,
      contactEmail: formData.email,
      phoneNumber: formData.contact,
      alternateContact: formData.alternateContact || '',
      address: formData.address,
      state: formData.state || '',
      district: formData.district || '',
      pinCode: formData.pincode || '',
      aadhaarNumber: formData.aadhaarNumber,
      panNumber: formData.panNumber,
      gstNumber: formData.gstNumber,
      status: formData.isActive !== false ? 'ACTIVE' : 'INACTIVE',
      creditLimit: formData.creditLimit || false,
      creditAmount: formData.creditAmount || 0,
      bankGuaranteeNumber: formData.bankGuaranteeNumber || '',
      bgExpiryDate: formData.bankGuaranteeExpiryDate || '',
      username: formData.username || '',
      password: formData.password || '',
      accountNumber: formData.accountNumber || '',
      ifsc: (formData.ifsc || '').toUpperCase(),
      accountName: formData.accountName || ''
    };

    console.log('Final payload after mapping:', payload);
    return payload;
  }

  // Get the name of the selected key person
  getSelectedKeyPersonName(): string {
    const keyPersonId = this.distributorForm.get('keyPerson')?.value;
    if (!keyPersonId) return '';
    const keyPerson = this.keyPersonsList.find(person => person.id === keyPersonId);
    return keyPerson ? (keyPerson.firstName + ' ' + keyPerson.lastName).trim() : '';
  }

  // Fetch Sales Persons for dropdown
  fetchSalesPersons() {
    this.distributorService.getSalesPersons().subscribe({
      next: (response: any) => {
        console.log('Sales persons response:', response);
        
        // Handle both array and wrapped response formats
        let salesData = Array.isArray(response) ? response : (response?.data || []);
        
        if (Array.isArray(salesData)) {
          this.salesPersons = salesData;
          console.log('Sales persons loaded:', this.salesPersons);
        } else {
          console.error('Invalid sales persons response format', response);
          this.salesPersons = [];
        }
      },
      error: (err) => {
        console.error('Failed to load sales persons', err);
        this.salesPersons = [];
      }
    });
  }

  // Handle sales person selection
  onSalesPersonChange(event: any) {
    const salespersonId = event.detail.value;
    this.distributorForm.patchValue({ salespersonId });
  }

  // API Method 1: Get All Distributors
  fetchDistributors() {
    this.isLoading = true;
    this.distributorService.getAllDistributors().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.distributors = response.data.map(dto => this.mapDtoToDistributor(dto));
          this.filteredDistributors = [...this.distributors];
          this.calculateStats();
        } else {
          console.error('Invalid response format', response);
          this.distributors = [];
          this.filteredDistributors = [];
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load distributors', err);
        this.isLoading = false;
        // Keep empty arrays on error
        this.distributors = [];
        this.filteredDistributors = [];
        this.calculateStats();
      }
    });
  }

  handlePullRefresh(event: any) {
    this.fetchDistributors();
    setTimeout(() => event.target.complete(), 1500);
  }

  calculateStats() {
    this.totalDistributors = this.distributors.length;
    this.totalAssignedPersons = new Set(this.distributors.map(d => d.assignedPerson)).size;
    this.totalDistributorTypes = new Set(this.distributors.map(d => d.distributorType)).size;
  }

  onSearchChange(event: any) {
    this.searchQuery = event.detail.value?.toLowerCase() || '';

    if (!this.searchQuery) {
      this.filteredDistributors = [...this.distributors];
      return;
    }

    this.filteredDistributors = this.distributors.filter(distributor =>
      distributor.name.toLowerCase().includes(this.searchQuery) ||
      distributor.assignedPerson.toLowerCase().includes(this.searchQuery) ||
      distributor.contact.includes(this.searchQuery) ||
      distributor.address.toLowerCase().includes(this.searchQuery)
    );
  }

  openAddModal() {
    this.haptic.medium();
    this.isEditing = false;
    this.editingSalesPersonRoleType = '';
    this.distributorForm.reset();
    this.distributorForm.patchValue({ username: '', password: '' });
    this.showAddModal = true;
  }

  closeAddModal() {
    this.haptic.light();
    this.showAddModal = false;
    this.editingSalesPersonRoleType = '';
    this.distributorForm.reset();
  }

  // API Method 2: Get Distributor by ID (when opening details)
  openDetailsModal(distributor: Distributor) {
    this.haptic.medium();
    const id = Number(distributor.id);
    this.isLoading = true;
    this.distributorStock = null;
    this.isLoadingStock = true;

    this.distributorService.getDistributorById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.selectedDistributor = this.mapDtoToDistributor(response.data);
        } else {
          // Fallback to passed distributor if API fails
          this.selectedDistributor = distributor;
        }
        this.showDetailsModal = true;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load distributor details', err);
        // Fallback to passed distributor
        this.selectedDistributor = distributor;
        this.showDetailsModal = true;
        this.isLoading = false;
      }
    });

    this.distributorService.getDistributorStock(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.distributorStock = response.data;
        }
        this.isLoadingStock = false;
      },
      error: () => {
        this.isLoadingStock = false;
      }
    });
  }

  closeDetailsModal() {
    this.haptic.light();
    this.showDetailsModal = false;
    this.selectedDistributor = null;
    this.distributorStock = null;
    this.isEditing = false;
    this.editingSalesPersonRoleType = '';
  }

  onEditDistributor() {
    this.haptic.medium();
    if (this.selectedDistributor) {
      this.isEditing = true;
      // editingSalesPersonRoleType kept for reference but no longer used in payload
      this.editingSalesPersonRoleType = this.selectedDistributor.salesPersonRoleType || '';

      // setTimeout ensures the *ngIf="isEditing" DOM (including ion-select) is fully
      // rendered before patchValue is called, otherwise selects ignore the value.
      setTimeout(() => {
        const dist = this.selectedDistributor!;

        // Pre-populate filteredDistricts from state so district dropdown is ready
        if (dist.state) {
          this.filteredDistricts = INDIA_LOCATION_DATA[dist.state] || [];
        }

        // Patch all form fields (assignedPerson = role dropdown value)
        this.distributorForm.patchValue({
          companyName: dist.companyName || dist.name || '',
          assignedPerson: dist.salesPersonRoleType || '',
          distributorType: dist.distributorType,
          companyType: dist.companyType,
          email: dist.email,
          contact: dist.contact,
          alternateContact: dist.alternateContact || '',
          address: dist.address,
          aadhaarNumber: dist.aadhaarNumber,
          panNumber: dist.panNumber,
          gstNumber: dist.gstNumber,
          accountNumber: dist.accountNumber || '',
          ifsc: dist.ifsc || '',
          accountName: dist.accountName || '',
          creditLimit: dist.creditLimit || false,
          creditAmount: dist.creditAmount || '',
          bankGuaranteeNumber: dist.bankGuaranteeNumber || '',
          bankGuaranteeExpiryDate: dist.bgExpiryDate || '',
          username: dist.username || '',
          password: dist.password || '',
          pincode: dist.pinCode || '',
          isActive: dist.status === 'ACTIVE' || !dist.status
        });

        // Set state silently to avoid valueChanges resetting district/pincode
        this.distributorForm.get('state')?.setValue(dist.state || '', { emitEvent: false });
        // Set district silently
        this.distributorForm.get('district')?.setValue(dist.district || '', { emitEvent: false });

        // After key persons are loaded, find and set matching one by salespersonId (then by name)
        const checkAndSetKeyPerson = () => {
          if (this.keyPersonsList && this.keyPersonsList.length > 0) {
            const matchById = dist.salespersonId
              ? this.keyPersonsList.find(p => p.id === dist.salespersonId)
              : null;
            const matchByName = this.keyPersonsList.find(p =>
              (p.firstName + ' ' + p.lastName).trim() === (dist.assignedPerson || '')
            );
            const match = matchById || matchByName;
            if (match) {
              this.distributorForm.patchValue({ keyPerson: match.id });
            }
          } else {
            setTimeout(checkAndSetKeyPerson, 500);
          }
        };

        // Start checking after a short delay to allow key persons to load
        setTimeout(checkAndSetKeyPerson, 1000);

        this.cdr.detectChanges();
      }, 300);
    }
  }

  // API Methods 3 & 4: Create or Update Distributor
  onSubmitForm() {
    this.haptic.medium();
    if (this.distributorForm.invalid) {
      console.log('Form is invalid. Invalid controls:');
      Object.keys(this.distributorForm.controls).forEach(key => {
        const control = this.distributorForm.get(key);
        if (control?.invalid) {
          console.log(`${key}: ${control.errors ? JSON.stringify(control.errors) : 'unknown error'}`);
        }
        this.distributorForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formData = this.distributorForm.value;
    console.log('Form data before mapping:', formData);
    const payload = this.mapFormToPayload(formData);

    if (this.isEditing && this.selectedDistributor) {
      // UPDATE existing distributor
      const id = Number(this.selectedDistributor.id);
      this.isLoading = true;

      this.distributorService.updateDistributor(id, payload).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const updatedDistributor = this.mapDtoToDistributor(response.data);
            
            // Update in local array
            const index = this.distributors.findIndex(d => d.id === this.selectedDistributor!.id);
            if (index !== -1) {
              this.distributors[index] = updatedDistributor;
            }
            
            this.filteredDistributors = [...this.distributors];
            this.calculateStats();
            this.isEditing = false;
            this.closeDetailsModal();
            this.distributorForm.reset();
          }
          this.isLoading = false;
        },
        error: (err) => {
          const errorMessage = this.extractErrorMessage(err);
          console.error('Failed to update distributor', err);
          this.isLoading = false;
          this.toast.present(errorMessage, 'danger');
        }
      });
    } else {
      // CREATE new distributor
      this.isLoading = true;
      console.log('Creating distributor with payload:', payload);

      this.distributorService.createDistributor(payload).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const newDistributor = this.mapDtoToDistributor(response.data);
            
            // Add to local array
            this.distributors.push(newDistributor);
            this.filteredDistributors = [...this.distributors];
            this.calculateStats();
            this.closeAddModal();
            this.distributorForm.reset();
            this.toast.present('Distributor created successfully!', 'success');
          }
          this.isLoading = false;
        },
        error: (err) => {
          const errorMessage = this.extractErrorMessage(err);
          console.error('Failed to create distributor', err);
          this.isLoading = false;
          this.toast.present(errorMessage, 'danger');
        }
      });
    }
  }

  cancelEdit() {
    this.isEditing = false;
    this.distributorForm.reset();
  }

  // Helper method to extract error message from API response
  private extractErrorMessage(error: any): string {
    if (!error) return 'An error occurred. Please try again.';
    
    if (error.error?.error) return error.error.error;
    if (error.error?.message) return error.error.message;
    
    if (error.error && typeof error.error === 'object' && !Array.isArray(error.error)) {
      const errorEntries = Object.entries(error.error);
      if (errorEntries.length > 0) {
        const errorMessages = errorEntries
          .map(([field, message]) => message as string)
          .filter(msg => msg && typeof msg === 'string');
        
        if (errorMessages.length > 0) return errorMessages.join('\n');
      }
    }
    
    if (error.statusText) return error.statusText;
    return 'Failed to process distributor. Please try again.';
  }

  // Show success alert
  async showSuccessAlert(message: string, title: string = 'Success') {
    const alert = await this.alertCtrl.create({
      header: title,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Delete confirmation
  openDeleteConfirmModal() {
    this.haptic.heavy();
    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirmModal() {
    this.haptic.light();
    this.showDeleteConfirmModal = false;
  }

  confirmDelete() {
    this.haptic.heavy();
    this.closeDeleteConfirmModal();
    this.deleteSelectedDistributor();
  }

  // API Method 5: Delete Distributor
  deleteSelectedDistributor() {
    if (!this.selectedDistributor) return;

    const confirmDelete = confirm(`Are you sure you want to delete ${this.selectedDistributor.name}?`);
    if (!confirmDelete) return;

    const id = Number(this.selectedDistributor.id);
    this.isLoading = true;

    this.distributorService.deleteDistributor(id).subscribe({
      next: (response) => {
        if (response.success) {
          // Remove from local array
          this.distributors = this.distributors.filter(d => d.id !== this.selectedDistributor!.id);
          this.filteredDistributors = [...this.distributors];
          this.calculateStats();
          this.closeDetailsModal();
          this.toast.present('Distributor deleted successfully!', 'success');
        }
        this.isLoading = false;
      },
      error: (err) => {
        const errorMessage = this.extractErrorMessage(err);
        console.error('Failed to delete distributor', err);
        this.isLoading = false;
        this.toast.present(errorMessage, 'danger');
      }
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.distributorForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('email')) {
      return 'Valid email required';
    }
    if (control?.hasError('minlength')) {
      const minLength = control.errors?.['minlength'].requiredLength;
      return `Minimum ${minLength} characters required`;
    }
    if (control?.hasError('maxlength')) {
      const maxLength = control.errors?.['maxlength'].requiredLength;
      return `Maximum ${maxLength} characters allowed`;
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Name',
      firmName: 'Firm name',
      lastName: 'Last name',
      assignedPerson: 'Assigned person',
      salespersonId: 'Sales person',
      keyPerson: 'Key person',
      distributorType: 'Distributor type',
      companyType: 'Company type',
      email: 'Email',
      contact: 'Contact number',
      address: 'Address',
      aadhaarNumber: 'Aadhar number',
      panNumber: 'PAN number',
      gstNumber: 'GST number',
      accountNumber: 'Account number',
      ifsc: 'IFSC code',
      accountName: 'Account holder name'
    };
    return labels[fieldName] || fieldName;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
