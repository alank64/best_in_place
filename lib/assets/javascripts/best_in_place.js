/*
        BestInPlace (for jQuery)
        version: 0.1.0 (01/01/2011)
        @requires jQuery >= v1.4
        @requires jQuery.purr to display pop-up windows

        By Bernat Farrero based on the work of Jan Varwig.
        Examples at http://bernatfarrero.com

        Licensed under the MIT:
          http://www.opensource.org/licenses/mit-license.php

        Usage:

        Attention.
        The format of the JSON object given to the select inputs is the following:
        [["key", "value"],["key", "value"]]
        The format of the JSON object given to the checkbox inputs is the following:
        ["falseValue", "trueValue"]
*/

function BestInPlaceEditor(e) {
  this.element = e;
  this.initOptions();
  this.bindForm();
  this.initNil();
  jQuery(this.activator).bind('click', {editor: this}, this.clickHandler);
}

BestInPlaceEditor.prototype = {
  // Public Interface Functions //////////////////////////////////////////////

  activate : function() {
    var to_display = "";
    if (this.isNil) {
      to_display = "";
    }
    else if (this.original_content) {
      to_display = this.original_content;
    }
    else {
      to_display = this.element.html();
    }

    var elem = this.isNil ? "-" : this.element.html();
    this.oldValue = elem;
    this.display_value = to_display;
    jQuery(this.activator).unbind("click", this.clickHandler);
    this.activateForm();
    this.element.trigger(jQuery.Event("best_in_place:activate"));
  },

  abort : function() {
    if (this.isNil) this.element.html(this.nil);
    else            this.element.html(this.oldValue);
    jQuery(this.activator).bind('click', {editor: this}, this.clickHandler);
    this.element.trigger(jQuery.Event("best_in_place:abort"));
    this.element.trigger(jQuery.Event("best_in_place:deactivate"));
  },

  abortIfConfirm : function () {
    if (confirm("Are you sure you want to discard your changes?")) {
      this.abort();
    }
  },

  update : function() {
    var editor = this;
    if (this.formType in {"input":1, "textarea":1} && this.getValue() == this.oldValue)
    { // Avoid request if no change is made
      this.abort();
      return true;
    }
    this.isNil = false;
    editor.ajax({
      "type"       : "post",
      "dataType"   : "text",
      "data"       : editor.requestData(),
      "success"    : function(data){ editor.loadSuccessCallback(data); },
      "error"      : function(request, error){ editor.loadErrorCallback(request, error); }
    });
    var newValue = this.getValue();
    if (this.formType == "select") {
      var value = this.getValue();
      jQuery.each(this.values, function(i, v) {
        if (value == v[0]) {
          editor.element.html(v[1]);
        }
      }
    );
    } else if (this.formType == "checkbox") {
      editor.element.html(this.getValue() ? this.values[1] : this.values[0]);
    } else {
      editor.element.html(this.getValue() !== "" ? this.getValue() : this.nil);
    }
    if(this.updatable){
      $('#' + this.updatable).html(newValue !== "" ? newValue : this.nil);
    }
    editor.element.trigger(jQuery.Event("best_in_place:update"));
  },

  activateForm : function() {
    alert("The form was not properly initialized. activateForm is unbound");
  },

  // Helper Functions ////////////////////////////////////////////////////////

  initOptions : function() {
    // Try parent supplied info
    var self = this;
    self.element.parents().each(function(){
      $parent = jQuery(this);
      self.url           = self.url           || $parent.attr("data-url");
      self.collection    = self.collection    || $parent.attr("data-collection");
      self.formType      = self.formType      || $parent.attr("data-type");
      self.objectName    = self.objectName    || $parent.attr("data-object");
      self.attributeName = self.attributeName || $parent.attr("data-attribute");
      self.activator     = self.activator     || $parent.attr("data-activator");
      self.okButton      = self.okButton      || $parent.attr("data-ok-button");
      self.cancelButton  = self.cancelButton  || $parent.attr("data-cancel-button");
      self.nil           = self.nil           || $parent.attr("data-nil");
      self.inner_class   = self.inner_class   || $parent.attr("data-inner-class");
      self.html_attrs    = self.html_attrs    || $parent.attr("data-html-attrs");
      self.original_content    = self.original_content    || $parent.attr("data-original-content");
      self.updatable     = self.updatable     || $parent.attr("data-updatable");
      self.ajaxurl       = self.ajaxurl       || $parent.attr("data-ajaxurl");
    });

    // Try Rails-id based if parents did not explicitly supply something
    self.element.parents().each(function(){
      var res = this.id.match(/^(\w+)_(\d+)$/i);
      if (res) {
        self.objectName = self.objectName || res[1];
      }
    });

    // Load own attributes (overrides all others)
    self.url           = self.element.attr("data-url")           || self.url      || document.location.pathname;
    self.collection    = self.element.attr("data-collection")    || self.collection;
    self.formType      = self.element.attr("data-type")          || self.formtype || "input";
    self.objectName    = self.element.attr("data-object")        || self.objectName;
    self.attributeName = self.element.attr("data-attribute")     || self.attributeName;
    self.activator     = self.element.attr("data-activator")     || self.element;
    self.okButton      = self.element.attr("data-ok-button")     || self.okButton;
    self.cancelButton  = self.element.attr("data-cancel-button") || self.cancelButton;
    self.nil           = self.element.attr("data-nil")           || self.nil      || "-";
    self.inner_class   = self.element.attr("data-inner-class")   || self.inner_class   || null;
    self.html_attrs    = self.element.attr("data-html-attrs")    || self.html_attrs;
    self.original_content    = self.element.attr("data-original-content") || self.original_content;
    self.updatable     = self.element.attr("data-updatable")     || self.updatable;
    self.ajaxurl       = self.element.attr("data-ajaxurl")       || self.ajaxurl || null;

    if (!self.element.attr("data-sanitize")) {
      self.sanitize = true;
    }
    else {
      self.sanitize = (self.element.attr("data-sanitize") == "true");
    }

    if ((self.formType == "select" || self.formType == "checkbox") && self.collection !== null)
    {
      self.values = jQuery.parseJSON(self.collection);
    }
  },

  bindForm : function() {
    this.activateForm = BestInPlaceEditor.forms[this.formType].activateForm;
    this.getValue     = BestInPlaceEditor.forms[this.formType].getValue;
  },

  initNil: function() {
    if (this.element.html() === "")
    {
      this.isNil = true;
      this.element.html(this.nil);
    }
  },

  getValue : function() {
    alert("The form was not properly initialized. getValue is unbound");
  },

  // Trim and Strips HTML from text
  sanitizeValue : function(s) {
    if (this.sanitize)
    {
      var tmp = document.createElement("DIV");
      tmp.innerHTML = s;
      s = jQuery.trim(tmp.textContent || tmp.innerText).replace(/"/g, '&quot;');
    }
   return jQuery.trim(s);
  },

  /* Generate the data sent in the POST request */
  requestData : function() {
    // To prevent xss attacks, a csrf token must be defined as a meta attribute
    csrf_token = jQuery('meta[name=csrf-token]').attr('content');
    csrf_param = jQuery('meta[name=csrf-param]').attr('content');

    var data = "_method=put";
    data += "&" + this.objectName + '[' + this.attributeName + ']=' + encodeURIComponent(this.getValue());

    if (csrf_param !== undefined && csrf_token !== undefined) {
      data += "&" + csrf_param + "=" + encodeURIComponent(csrf_token);
    }
    return data;
  },

  ajax : function(options) {
    options.url = this.url;
    options.beforeSend = function(xhr){ xhr.setRequestHeader("Accept", "application/json"); };
    return jQuery.ajax(options);
  },

  // Handlers ////////////////////////////////////////////////////////////////

  loadSuccessCallback : function(data) {
    var response = jQuery.parseJSON(jQuery.trim(data));
    if (response !== null && response.hasOwnProperty("display_as")) {
      this.element.attr("data-original-content", this.element.html());
      this.original_content = this.element.html();
      this.element.html(response["display_as"]);
    }
    this.element.trigger(jQuery.Event("ajax:success"), data);

    // Binding back after being clicked
    jQuery(this.activator).bind('click', {editor: this}, this.clickHandler);
    this.element.trigger(jQuery.Event("best_in_place:deactivate"));
  },

  loadErrorCallback : function(request, error) {
    this.element.html(this.oldValue);

    // Display all error messages from server side validation
    jQuery.each(jQuery.parseJSON(request.responseText), function(index, value) {
      if( typeof(value) == "object") {value = index + " " + value.toString(); }
      var container = jQuery("<span class='flash-error'></span>").html(value);
      container.purr();
    });
    this.element.trigger(jQuery.Event("ajax:error"));

    // Binding back after being clicked
    jQuery(this.activator).bind('click', {editor: this}, this.clickHandler);
    this.element.trigger(jQuery.Event("best_in_place:deactivate"));
  },

  clickHandler : function(event) {
    event.preventDefault();
    event.data.editor.activate();
  },

  setHtmlAttributes : function() {
    var formField = this.element.find(this.formType);
    var attrs = jQuery.parseJSON(this.html_attrs);
    for(var key in attrs){
      formField.attr(key, attrs[key]);
    }
  }
};


// Button cases:
// If no buttons, then blur saves, ESC cancels
// If just Cancel button, then blur saves, ESC or clicking Cancel cancels (careful of blur event!)
// If just OK button, then clicking OK saves (careful of blur event!), ESC or blur cancels
// If both buttons, then clicking OK saves, ESC or clicking Cancel or blur cancels
BestInPlaceEditor.forms = {
  "input" : {
    activateForm : function() {
      var output = '<form class="form_in_place" action="javascript:void(0)" style="display:inline;">';
      output += '<input type="text" name="'+ this.attributeName + '" value="' + this.sanitizeValue(this.display_value) + '"';
      if (this.inner_class !== null) {
        output += ' class="' + this.inner_class + '"';
      }
      output += '>';
      if (this.okButton) {
        output += '<input type="submit" value="' + this.okButton + '" />';
      }
      if (this.cancelButton) {
        output += '<input type="button" value="' + this.cancelButton + '" />';
      }
      output += '</form>';
      this.element.html(output);
      this.setHtmlAttributes();
      this.element.find("input[type='text']")[0].select();
      this.element.find("form").bind('submit', {editor: this}, BestInPlaceEditor.forms.input.submitHandler);
      if (this.cancelButton) {
        this.element.find("input[type='button']").bind('click', {editor: this}, BestInPlaceEditor.forms.input.cancelButtonHandler);
      }
      this.element.find("input[type='text']").bind('blur', {editor: this}, BestInPlaceEditor.forms.input.inputBlurHandler);
      this.element.find("input[type='text']").bind('keyup', {editor: this}, BestInPlaceEditor.forms.input.keyupHandler);
      this.blurTimer = null;
      this.userClicked = false;
    },

    getValue : function() {
      return this.sanitizeValue(this.element.find("input").val());
    },

    // When buttons are present, use a timer on the blur event to give precedence to clicks
    inputBlurHandler : function(event) {
      if (event.data.editor.okButton) {
        event.data.editor.blurTimer = setTimeout(function () {
          if (!event.data.editor.userClicked) {
            event.data.editor.abort();
          }
        }, 500);
      } else {
        if (event.data.editor.cancelButton) {
          event.data.editor.blurTimer = setTimeout(function () {
            if (!event.data.editor.userClicked) {
              event.data.editor.update();
            }
          }, 500);
        } else {
          event.data.editor.update();
        }
      }
    },

    submitHandler : function(event) {
      event.data.editor.userClicked = true;
      clearTimeout(event.data.editor.blurTimer);
      event.data.editor.update();
    },

    cancelButtonHandler : function(event) {
      event.data.editor.userClicked = true;
      clearTimeout(event.data.editor.blurTimer);
      event.data.editor.abort();
      event.stopPropagation(); // Without this, click isn't handled
    },

    keyupHandler : function(event) {
      if (event.keyCode == 27) {
        event.data.editor.abort();
      }
    }
  },

  "date" : {
    activateForm : function() {
      var that = this,
        output = '<form class="form_in_place" action="javascript:void(0)" style="display:inline;">';
      output += '<input type="text" name="'+ this.attributeName + '" value="' + this.sanitizeValue(this.display_value) + '"';
      if (this.inner_class !== null) {
        output += ' class="' + this.inner_class + '"';
      }
      output += '></form>';
      this.element.html(output);
      this.setHtmlAttributes();
      this.element.find('input')[0].select();
      this.element.find("form").bind('submit', {editor: this}, BestInPlaceEditor.forms.input.submitHandler);
      this.element.find("input").bind('keyup', {editor: this}, BestInPlaceEditor.forms.input.keyupHandler);

      this.element.find('input')
        .datepicker({
            onClose: function() {
              that.update();
            }
          })
        .datepicker('show');
    },

    getValue :  function() {
      return this.sanitizeValue(this.element.find("input").val());
    },

    submitHandler : function(event) {
      event.data.editor.update();
    },

    keyupHandler : function(event) {
      if (event.keyCode == 27) {
        event.data.editor.abort();
      }
    }
  },


  "yearmonthday" : {
    activateForm : function() {
      // var value = this.sanitizeValue(value);
      // var val = this.sanitizeValue(this.display_value);
      var months = new Array("January","February","March","April","May","June","July","August","September","October","November","December");
      var days = new Array("1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31");
      var date_arr = this.display_value.split('-');
      var year = date_arr[0];
      var month = date_arr[1];
      var day = date_arr[2];
      //console.log("activateForm: " + this.display_value + " YEAR=" + year + " MONTH=" + month);
      var that = this;
      var output = '<form class="form_in_place" action="javascript:void(0)" style="display:inline;">';
      var selected = "";
      var oldValue = this.oldValue;
        
      output += '<input class="year_input" placeholder="YYYY" type="text" name="'+ this.attributeName + '_year" value="' + year + '">';
      
      output += '<select class="month_select" name="' + this.attributeName + '_month" value=' + this.sanitizeValue(this.display_value) + '>';
      
      // display all the months
      for (var i = 0; i < months.length; i++){
        output += '<option value="' + (i + 1) + '"' + ((i+1) == month ? ' selected="selected"' : '') + '>' + months[i] + '</option>';
      }      
      output += '</select>';
      
      output += '<select class="day_select" name="' + this.attributeName + '_day" value=' + this.sanitizeValue(this.display_value) + '>';
      
      // display all the days
      for (var i = 0; i < days.length; i++){
        output += '<option value="' + (i + 1) + '"' + ((i + 1) == day ? ' selected="selected"' : '') + '>' + days[i] + '</option>';
      }      
      output += '</select>';
      
      
      
      
      output += '<input type="submit" class="ok_button" value="' + (this.okButton ? this.okButton : 'set') + '" />';
      if (this.cancelButton) {
        output += '<input type="button" class="cancel_button" value="' + this.cancelButton + '" />';
      }
      output += '</form>';
      
      this.element.html(output);
      this.setHtmlAttributes();
      this.element.find("input[type='text']")[0].select();
      this.element.find("form").bind('submit', {editor: this}, BestInPlaceEditor.forms.input.submitHandler);
      if (this.cancelButton) {
        this.element.find("input[type='button']").bind('click', {editor: this}, BestInPlaceEditor.forms.input.cancelButtonHandler);
      }
      
      this.element.find("input").bind('keyup', {editor: this}, BestInPlaceEditor.forms.input.keyupHandler);
      this.element.find("select").bind('keyup', {editor: this}, BestInPlaceEditor.forms.select.keyupHandler);
      
      //this.element.find("select").bind('change', {editor: this}, BestInPlaceEditor.forms.select.blurHandler);
      
      
      this.element.find("input")[0].focus();

    },

    getValue :  function() {
      var month_adjust = this.element.find("select").eq(0).val();
      var day_adjust = this.element.find("select").eq(1).val();
      if(month_adjust.length == 1) month_adjust = '0' + month_adjust;
      if(day_adjust.length == 1) day_adjust = '0' + day_adjust;
      return this.sanitizeValue(this.element.find("input").val() + '-' + month_adjust + '-' + day_adjust);
    },

    submitHandler : function(event) {
      event.data.editor.userClicked = true;
      event.data.editor.update();
    },
    
    keyupHandler : function(event) {
      console.log("keyupHandler");
      if (event.keyCode == 27) {
        event.data.editor.abort();
      }
    }
  },


  "yearmonthday_fr" : {
    activateForm : function() {
      // var value = this.sanitizeValue(value);
      // var val = this.sanitizeValue(this.display_value);
      var months = new Array("Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre");
      var days = new Array("1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31");
      var date_arr = this.display_value.split('-');
      var year = date_arr[0];
      var month = date_arr[1];
      var day = date_arr[2];
      //console.log("activateForm: " + this.display_value + " YEAR=" + year + " MONTH=" + month);
      var that = this;
      var output = '<form class="form_in_place" action="javascript:void(0)" style="display:inline;">';
      var selected = "";
      var oldValue = this.oldValue;
        
      output += '<input class="year_input" placeholder="AAAA" type="text" name="'+ this.attributeName + '_year" value="' + year + '">';
      
      output += '<select class="month_select" name="' + this.attributeName + '_month" value=' + this.sanitizeValue(this.display_value) + '>';
      
      // display all the months
      for (var i = 0; i < months.length; i++){
        output += '<option value="' + (i + 1) + '"' + ((i+1) == month ? ' selected="selected"' : '') + '>' + months[i] + '</option>';
      }      
      output += '</select>';
      
      output += '<select class="day_select" name="' + this.attributeName + '_day" value=' + this.sanitizeValue(this.display_value) + '>';
      
      // display all the days
      for (var i = 0; i < days.length; i++){
        output += '<option value="' + (i + 1) + '"' + ((i + 1) == day ? ' selected="selected"' : '') + '>' + days[i] + '</option>';
      }      
      output += '</select>';
      
      
      
      
      output += '<input type="submit" class="ok_button" value="' + (this.okButton ? this.okButton : 'set') + '" />';
      if (this.cancelButton) {
        output += '<input type="button" class="cancel_button" value="' + this.cancelButton + '" />';
      }
      output += '</form>';
      
      this.element.html(output);
      this.setHtmlAttributes();
      this.element.find("input[type='text']")[0].select();
      this.element.find("form").bind('submit', {editor: this}, BestInPlaceEditor.forms.input.submitHandler);
      if (this.cancelButton) {
        this.element.find("input[type='button']").bind('click', {editor: this}, BestInPlaceEditor.forms.input.cancelButtonHandler);
      }
      
      this.element.find("input").bind('keyup', {editor: this}, BestInPlaceEditor.forms.input.keyupHandler);
      this.element.find("select").bind('keyup', {editor: this}, BestInPlaceEditor.forms.select.keyupHandler);
      
      //this.element.find("select").bind('change', {editor: this}, BestInPlaceEditor.forms.select.blurHandler);
      
      
      this.element.find("input")[0].focus();

    },

    getValue :  function() {
      var month_adjust = this.element.find("select").eq(0).val();
      var day_adjust = this.element.find("select").eq(1).val();
      if(month_adjust.length == 1) month_adjust = '0' + month_adjust;
      if(day_adjust.length == 1) day_adjust = '0' + day_adjust;
      return this.sanitizeValue(this.element.find("input").val() + '-' + month_adjust + '-' + day_adjust);
    },

    submitHandler : function(event) {
      event.data.editor.userClicked = true;
      event.data.editor.update();
    },
    
    keyupHandler : function(event) {
      console.log("keyupHandler");
      if (event.keyCode == 27) {
        event.data.editor.abort();
      }
    }
  },






  
  "yearmonth" : {
    activateForm : function() {
      // var value = this.sanitizeValue(value);
      // var val = this.sanitizeValue(this.display_value);
      var months = new Array("January","February","March","April","May","June","July","August","September","October","November","December");
      
      var date_arr = this.display_value.split('-');
      var year = date_arr[0];
      var month = date_arr[1];
      var that = this;
      var output = '<form class="form_in_place" action="javascript:void(0)" style="display:inline;">';
      var selected = "";
      var oldValue = this.oldValue;
        
      output += '<input type="text" name="'+ this.attributeName + '_year" value="' + year + '">';
      
      output += '<select name="' + this.attributeName + '_month" value=' + this.sanitizeValue(this.display_value) + '>';
      
      // display all the months
      for (var i = 0; i < months.length; i++){
        output += '<option value="' + (i + 1) + '"' + ((i + 1) == month ? ' selected="selected"' : '') + '>' + months[i] + '</option>';
      }      
      output += '</select>';
      output += '<input type="submit" class="ok_button" value="' + (this.okButton ? this.okButton : 'set') + '" />';
      if (this.cancelButton) {
        output += '<input type="button" value="' + this.cancelButton + '" />';
      }
      output += '</form>';
      
      this.element.html(output);
      this.setHtmlAttributes();
      this.element.find("input[type='text']")[0].select();
      this.element.find("form").bind('submit', {editor: this}, BestInPlaceEditor.forms.input.submitHandler);
      if (this.cancelButton) {
        this.element.find("input[type='button']").bind('click', {editor: this}, BestInPlaceEditor.forms.input.cancelButtonHandler);
      }
      
      this.element.find("input").bind('keyup', {editor: this}, BestInPlaceEditor.forms.input.keyupHandler);
      this.element.find("select").bind('keyup', {editor: this}, BestInPlaceEditor.forms.select.keyupHandler);
      
      this.element.find("input")[0].focus();

    },

    getValue :  function() {
      var date_adjust = this.element.find("select").val();
      if(date_adjust.length == 1)
        date_adjust = '0' + date_adjust;
      return this.sanitizeValue(this.element.find("input").val() + '-' + date_adjust + '-01');
    },

    submitHandler : function(event) {
      event.data.editor.userClicked = true;
      event.data.editor.update();
    },
    
    keyupHandler : function(event) {
      if (event.keyCode == 27) {
        event.data.editor.abort();
      }
    }
  },
  
  "select2" : {
    activateForm : function() {
      var that = this,
        output = '<form class="form_in_place" action="javascript:void(0)" style="display:inline;position:relative">';
      output += '<input type="hidden" name="'+ this.attributeName + '" value="' + this.sanitizeValue(this.display_value) + '"';
      if (this.inner_class !== null) {
        output += ' class="' + this.inner_class + '"';
      }
      output += ' style="display:none"></form>';
      this.element.html(output);
      this.setHtmlAttributes();
      this.element.find('input')[0].select();
      this.element.find("form").bind('submit', {editor: this}, BestInPlaceEditor.forms.input.submitHandler);
      this.element.find("input").bind('keyup', {editor: this}, BestInPlaceEditor.forms.input.keyupHandler);

      this.element.find('input:hidden').select2({
        placeholder: this.nil,
        minimumInputLength: 1,
        width: 'element',
        ajax: {
          url: this.ajaxurl,
          dataType: 'json',
          quietMillis: 400,
          tokenSeparators: ',',
          data: function (term, page) {
            return {
              q: term,
              page_limit: 10
            };
          },
          results: function (data, page) { 
            return {results: data.results};
          }
        }
      });

      $('.select2-input').keypress(function(event){
 
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if(keycode == '13'){
          
          that.element.find('input:hidden').val($(this).val());
          //that.element.find('input:hidden').select2('close');
          that.update();
        }
 
      });
      

      this.element.find('input:hidden').on("change", function(e) { 
        that.update(); 
      });          
      
    },

    getValue :  function() {
      var value = this.sanitizeValue(this.element.find("input:hidden").val());
      this.element.find('input:hidden').select2('close');
      return value;
    },

    submitHandler : function(event) {
      event.data.editor.update();
    },

    keyupHandler : function(event) {
      if (event.keyCode == 27) {
        event.data.editor.abort();
      }
    }
  },
  
  "select" : {
    activateForm : function() {
      var output = "<form action='javascript:void(0)' style='display:inline;'><select>";
      var selected = "";
      var oldValue = this.oldValue;
      jQuery.each(this.values, function(index, value) {
        selected = (value[1] == oldValue ? "selected='selected'" : "");
        output += "<option value='" + value[0] + "' " + selected + ">" + value[1] + "</option>";
       });
      output += "</select></form>";
      this.element.html(output);
      this.setHtmlAttributes();
      this.element.find("select").bind('change', {editor: this}, BestInPlaceEditor.forms.select.blurHandler);
      this.element.find("select").bind('blur', {editor: this}, BestInPlaceEditor.forms.select.blurHandler);
      this.element.find("select").bind('keyup', {editor: this}, BestInPlaceEditor.forms.select.keyupHandler);
      this.element.find("select")[0].focus();
    },

    getValue : function() {
      return this.sanitizeValue(this.element.find("select").val());
    },

    blurHandler : function(event) {
      event.data.editor.update();
    },

    keyupHandler : function(event) {
      if (event.keyCode == 27) event.data.editor.abort();
    }
  },

  "checkbox" : {
    activateForm : function() {
      var newValue = Boolean(this.oldValue != this.values[1]);
      var output = newValue ? this.values[1] : this.values[0];
      this.element.html(output);
      this.setHtmlAttributes();
      this.update();
    },

    getValue : function() {
      return Boolean(this.element.html() == this.values[1]);
    }
  },

  "textarea" : {
    activateForm : function() {
      // grab width and height of text
      width = this.element.css('width');
      height = this.element.css('height');

      // construct the form
      var output = '<form action="javascript:void(0)" style="display:inline;"><textarea>';
      output += this.sanitizeValue(this.display_value);
      output += '</textarea>';
      if (this.okButton) {
        output += '<input type="submit" value="' + this.okButton + '" />';
      }
      if (this.cancelButton) {
        output += '<input type="button" value="' + this.cancelButton + '" />';
      }
      output += '</form>';
      this.element.html(output);
      this.setHtmlAttributes();

      // set width and height of textarea
      jQuery(this.element.find("textarea")[0]).css({ 'min-width': width, 'min-height': height });
      jQuery(this.element.find("textarea")[0]).elastic();

      this.element.find("textarea")[0].focus();
      this.element.find("form").bind('submit', {editor: this}, BestInPlaceEditor.forms.textarea.submitHandler);
      if (this.cancelButton) {
        this.element.find("input[type='button']").bind('click', {editor: this}, BestInPlaceEditor.forms.textarea.cancelButtonHandler);
      }
      this.element.find("textarea").bind('blur', {editor: this}, BestInPlaceEditor.forms.textarea.blurHandler);
      this.element.find("textarea").bind('keyup', {editor: this}, BestInPlaceEditor.forms.textarea.keyupHandler);
      this.blurTimer = null;
      this.userClicked = false;
    },

    getValue :  function() {
      return this.sanitizeValue(this.element.find("textarea").val());
    },

    // When buttons are present, use a timer on the blur event to give precedence to clicks
    blurHandler : function(event) {
      if (event.data.editor.okButton) {
        event.data.editor.blurTimer = setTimeout(function () {
          if (!event.data.editor.userClicked) {
            event.data.editor.abortIfConfirm();
          }
        }, 500);
      } else {
        if (event.data.editor.cancelButton) {
          event.data.editor.blurTimer = setTimeout(function () {
            if (!event.data.editor.userClicked) {
              event.data.editor.update();
            }
          }, 500);
        } else {
          event.data.editor.update();
        }
      }
    },

    submitHandler : function(event) {
      event.data.editor.userClicked = true;
      clearTimeout(event.data.editor.blurTimer);
      event.data.editor.update();
    },

    cancelButtonHandler : function(event) {
      event.data.editor.userClicked = true;
      clearTimeout(event.data.editor.blurTimer);
      event.data.editor.abortIfConfirm();
      event.stopPropagation(); // Without this, click isn't handled
    },

    keyupHandler : function(event) {
      if (event.keyCode == 27) {
        event.data.editor.abortIfConfirm();
      }
    }
  }
};

jQuery.fn.best_in_place = function() {

  function setBestInPlace(element) {
    if (!element.data('bestInPlaceEditor')) {
      element.data('bestInPlaceEditor', new BestInPlaceEditor(element));
      return true;
    }
  }

  jQuery(this.context).delegate(this.selector, 'click', function () {
    var el = jQuery(this);
    if (setBestInPlace(el))
      el.click();
  });

  this.each(function () {
    setBestInPlace(jQuery(this));
  });

  return this;
};



/**
* @name             Elastic
* @descripton           Elastic is Jquery plugin that grow and shrink your textareas automaticliy
* @version            1.6.5
* @requires           Jquery 1.2.6+
*
* @author             Jan Jarfalk
* @author-email         jan.jarfalk@unwrongest.com
* @author-website         http://www.unwrongest.com
*
* @licens             MIT License - http://www.opensource.org/licenses/mit-license.php
*/

(function(jQuery){
  jQuery.fn.extend({
    elastic: function() {
      //  We will create a div clone of the textarea
      //  by copying these attributes from the textarea to the div.
      var mimics = [
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'fontSize',
        'lineHeight',
        'fontFamily',
        'width',
        'fontWeight'];

      return this.each( function() {

        // Elastic only works on textareas
        if ( this.type != 'textarea' ) {
          return false;
        }

        var $textarea = jQuery(this),
          $twin   = jQuery('<div />').css({'position': 'absolute','display':'none','word-wrap':'break-word'}),
          lineHeight  = parseInt($textarea.css('line-height'),10) || parseInt($textarea.css('font-size'),'10'),
          minheight = parseInt($textarea.css('height'),10) || lineHeight*3,
          maxheight = parseInt($textarea.css('max-height'),10) || Number.MAX_VALUE,
          goalheight  = 0,
          i       = 0;

        // Opera returns max-height of -1 if not set
        if (maxheight < 0) { maxheight = Number.MAX_VALUE; }

        // Append the twin to the DOM
        // We are going to meassure the height of this, not the textarea.
        $twin.appendTo($textarea.parent());

        // Copy the essential styles (mimics) from the textarea to the twin
        i = mimics.length;
        while(i--){
          $twin.css(mimics[i].toString(),$textarea.css(mimics[i].toString()));
        }


        // Sets a given height and overflow state on the textarea
        function setHeightAndOverflow(height, overflow){
          curratedHeight = Math.floor(parseInt(height,10));
          if($textarea.height() != curratedHeight){
            $textarea.css({'height': curratedHeight + 'px','overflow':overflow});

          }
        }


        // This function will update the height of the textarea if necessary
        function update() {

          // Get curated content from the textarea.
          var textareaContent = $textarea.val().replace(/&/g,'&amp;').replace(/  /g, '&nbsp;').replace(/<|>/g, '&gt;').replace(/\n/g, '<br />');

          // Compare curated content with curated twin.
          var twinContent = $twin.html().replace(/<br>/ig,'<br />');

          if(textareaContent+'&nbsp;' != twinContent){

            // Add an extra white space so new rows are added when you are at the end of a row.
            $twin.html(textareaContent+'&nbsp;');

            // Change textarea height if twin plus the height of one line differs more than 3 pixel from textarea height
            if(Math.abs($twin.height() + lineHeight - $textarea.height()) > 3){

              var goalheight = $twin.height()+lineHeight;
              if(goalheight >= maxheight) {
                setHeightAndOverflow(maxheight,'auto');
              } else if(goalheight <= minheight) {
                setHeightAndOverflow(minheight,'hidden');
              } else {
                setHeightAndOverflow(goalheight,'hidden');
              }

            }

          }

        }

        // Hide scrollbars
        $textarea.css({'overflow':'hidden'});

        // Update textarea size on keyup, change, cut and paste
        $textarea.bind('keyup change cut paste', function(){
          update();
        });

        // Compact textarea on blur
        // Lets animate this....
        $textarea.bind('blur',function(){
          if($twin.height() < maxheight){
            if($twin.height() > minheight) {
              $textarea.height($twin.height());
            } else {
              $textarea.height(minheight);
            }
          }
        });

        // And this line is to catch the browser paste event
        $textarea.live('input paste',function(e){ setTimeout( update, 250); });

        // Run update once when elastic is initialized
        update();

      });

        }
    });
})(jQuery);
