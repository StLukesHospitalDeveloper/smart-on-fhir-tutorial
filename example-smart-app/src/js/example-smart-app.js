(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
    }

    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                        $or: ['http://loinc.org|8302-2', 'http://loinc.org|8462-4',
                              'http://loinc.org|8480-6', 'http://loinc.org|2085-9',
                              'http://loinc.org|2089-1', 'http://loinc.org|55284-4']
                      }
                    }
                  });

        $.when(pt, obv).fail(onError);

        $.when(pt, obv).done(function(patient, obv) {
          var byCodes = smart.byCodes(obv, 'code');
          var gender = patient.gender;
          var dob = new Date(patient.birthDate);
          var day = dob.getDate();
          var monthIndex = dob.getMonth() + 1;
          var year = dob.getFullYear();

          var dobStr = monthIndex + '/' + day + '/' + year;
          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
          }

          var height = byCodes('8302-2');
          var systolicbp = getBloodPressureValue(byCodes('55284-4'),'8480-6');
          var diastolicbp = getBloodPressureValue(byCodes('55284-4'),'8462-4');
          var hdl = byCodes('2085-9');
          var ldl = byCodes('2089-1');

          var p = defaultPatient();
          p.birthdate = dobStr;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.age = parseInt(calculateAge(dob));
          p.height = getQuantityValueAndUnit(height[0]);

          if (typeof systolicbp != 'undefined')  {
            p.systolicbp = systolicbp;
          }

          if (typeof diastolicbp != 'undefined') {
            p.diastolicbp = diastolicbp;
          }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);
          
          
          
          /*
            Testing
          */
          p.indentifier_length = patient.identifier.length;
          if (typeof patient.identifier[0] !== 'undefined') {
            var identifier = patient.identifier[0];
            p.identifier_use = identifier.use;
            p.identifier_type = identifier.type;
            p.identifier_system = identifier.system;
            p.identifier_value = identifier.value;
            p.identifier_period = identifier.period;
            p.identifier_assigner = identifier.assigner;
          }
          p.active = patient.active;
          p.name_length = patient.name.length;
          if (typeof patient.name[0] !== 'undefined') {
            var name = patient.name[0];
            p.name_use = name.use;
            p.name_text = name.text;
            p.name_family = name.family;
            p.name_given = name.given;
            p.name_suffix = name.suffix;
            p.name_period = name.period;
          }
          p.telecom = patient.telecom;
          //p.gender = patient.gender;
          p.birthDate2 = patient.birthdate;
          p.deceasedBoolean = patient.deceasedBoolean;
          p.deceasedDateTime = patient.deceasedDateTime;
          p.address_length = patient.address.length;
          if (typeof patient.address[0] !== 'undefined') {
            var address = patient.address[0];
            p.address_use: address.use;
            p.address_type: address.type;
            p.address_text: address.text;
            p.address_line: address.line;
            p.address_city: address.city;
            p.address_district: address.district;
            p.address_state: address.state;
            p.address_postalCode: address.postalCode;
            p.address_country: address.country;
            p.address_period: address.period;
          }
          

          ret.resolve(p);
        });
      } else {
        onError();
      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {     
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: ''},
      age: {value: ''},
      height: {value: ''},
      systolicbp: {value: ''},
      diastolicbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: ''},
      
      
      
      identifier_length: {value: ''},
      identifier_use: {value: ''},
      identifier_type: {value: ''},
      identifier_system: {value: ''},
      identifier_value: {value: ''},
      identifier_period: {value: ''},
      identifier_assigner: {value: ''},
      active: {value: ''},
      name_length: {value: ''},
      name_use: {value: ''},
      name_text: {value: ''},
      name_family: {value: ''},
      name_given: {value: ''},
      name_suffix: {value: ''},
      name_period: {value: ''},
      telecom: {value: ''},
      birthDate2: {value: ''},
      deceasedBoolean: {value: ''},
      deceasedDateTime: {value: ''},
      address_length: {value: ''},
      address_use: {value: ''},
      address_type: {value: ''},
      address_text: {value: ''},
      address_line: {value: ''},
      address_city: {value: ''},
      address_district: {value: ''},
      address_state: {value: ''},
      address_postalCode: {value: ''},
      address_country: {value: ''},
      address_period: {value: ''}
      
      
      
    };
  }

  function getBloodPressureValue(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });

    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

  function isLeapYear(year) {
    return new Date(year, 1, 29).getMonth() === 1;
  }

  function calculateAge(date) {
    if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
      var d = new Date(date), now = new Date();
      var years = now.getFullYear() - d.getFullYear();
      d.setFullYear(d.getFullYear() + years);
      if (d > now) {
        years--;
        d.setFullYear(d.getFullYear() - 1);
      }
      var days = (now.getTime() - d.getTime()) / (3600 * 24 * 1000);
      return years + days / (isLeapYear(now.getFullYear()) ? 366 : 365);
    }
    else {
      return undefined;
    }
  }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
  }

  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();   
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#age').html(p.age);
    $('#height').html(p.height);
    $('#systolicbp').html(p.systolicbp);
    $('#diastolicbp').html(p.diastolicbp);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    
    
    
    
    
    $('#identifier_length').html(p.identifier_length);
    $('#identifier_use').html(p.identifier_use);
    $('#identifier_type').html(p.identifier_type);
    $('#identifier_system').html(p.identifier_system);
    $('#identifier_value').html(p.identifier_value);
    $('#identifier_period').html(p.identifier_period);
    $('#identifier_assigner').html(p.identifier_assigner);
    $('#active').html(p.active);
    $('#name_length').html(p.name_length);
    $('#name_use').html(p.name_use);
    $('#name_text').html(p.name_text);
    $('#name_family').html(p.name_family);
    $('#name_given').html(p.name_given);
    $('#name_prefix').html(p.name_prefix);
    $('#name_suffix').html(p.name_suffix);
    $('#name_period').html(p.name_period);
    $('#telecom').html(p.telecom);
    $('#birthDate2').html(p.birthDate2);
    $('#deceasedBoolean').html(p.deceasedBoolean);
    $('#deceasedDateTime').html(p.deceasedDateTime);
    $('#address_length').html(p.address_length);
    $('#address_use').html(p.address_use);
    $('#address_type').html(p.address_type);
    $('#address_text').html(p.address_text);
    $('#address_line').html(p.address_line);
    $('#address_city').html(p.address_city);
    $('#address_district').html(p.address_district);
    $('#address_state').html(p.address_state);
    $('#address_postalCode').html(p.address_postalCode);
    $('#address_country').html(p.address_country);
    $('#address_period').html(p.address_period);
    
    
  };

})(window);
