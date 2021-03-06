!(function() {
	/**
	 * [JCTree 人员选择树]
	 * 本控件依赖以下控件
	 *  	JQuery 		控件
	 *  	select2 	选择控件
	 *		zTree 		控件
	 * 		ChinesePY 	汉字转拼音
	 *  文档查看
	 *  http://192.168.200.212:8090/pages/viewpage.action?pageId=328159
	 */
	var JCTree = {};
	//控件ID,Name下标标示
	JCTree.index = 0;

	var modalbody = 'body';
	
	JCTree.getModalBody = function(){
		return $(modalbody);
	};

	JCTree.setModalBody = function(obj){
		modalbody = obj;
	};

	SelectControl.DEFALUT = {
		container		: null,
		controlId 		: null,
		isCheckOrRadio	: true,
		isPersonOrOrg	: true,
		orgOrDept		: 'all',
		isReadonly 		: false,
		echoData		: null,
		callback		: null,
		urls : {
			//所有部门和用户
			user 	: getRootPath()+"/department/getAllDeptAndUser.action",
			//所有机构和组织
			org	  	: getRootPath()+"/department/getOrgTree.action",
			//只有机构没有组织
			orgNoDept 	: getRootPath()+"/department/getAllOrgNoDeptTree.action",
			//在线
			line    : getRootPath()+"/department/getDeptAndUserByOnLine.action",
			//职务
			post    : getRootPath()+"/department/getPostAndUser.action",
			//人员组别
			personGroup : getRootPath()+"/department/getPersonGroupAndUser.action",
			//公共组别
			publicGroup : getRootPath()+"/department/getPublicGroupAndUser.action",
			//人员详细信息查询
			findById    : getRootPath()+"/system/getUserById.action",
			//部门人员
			orgdept     : getRootPath()+"/department/getOrgAndPersonTree.action",
			//权限树						  
			ztree    	: getRootPath()+"/system/managerDeptTree.action",
			//左右选择
			mutual 		: getRootPath()+"/leftRightDemo/getData.action"
		}
	};
	function SelectControl(options) {
		var x = 1000,
			y = 10;
		//显示层对象
		this.$controlDivId = options.container?$('#' + options.container):null;
		//唯一标识
		this.rand = parseInt(Math.random() * (x - y + 1) + y);
		//组织机构标识
		this.index = JCTree.index = JCTree.index + 1;
		//缓存人员数据对象
		this.userCacheData = [];
		//缓存部门人员数据对象
		this.deptCacheData = [];
		//组织数据缓存
		this.orgCacheData  = [];
		//ztree使用数据
		this.ztreeCacheData = [];
		//搜索数据缓存
		this.searchCacheData = [];
		//搜索结果缓存
		this.searchResultData = [];
		//全选按钮状态
		this.selectBoxs = false;
		//load元素对象
		this.dataLoad = null;
				
		this.option = $.extend({}, SelectControl.DEFALUT, options);

		return this.initialize(this.option);
	}

	SelectControl.prototype = {
		initialize : function(option) {
			var thie = this;
			if(thie.$controlDivId)thie.$controlDivId.empty();
			if (option.isPersonOrOrg) {
				thie.getPersonDom();
			} else {
				thie.getOrgDom();
			}
		},
		//显示层静态方法
		show  : function(callback){
			var thie = this,
				opt  = thie.option;
			if(typeof callback === 'function') callback();
			if(opt.isPersonOrOrg){
				var mid = 'openPersonDiv'+thie.rand,
					sid = 'backValue'+thie.rand,
					idC = opt.isCheckOrRadio,
					cot = opt.controlId;
				this.openPerson(idC,mid,sid,cot);
			}else{
				var modalId = "tree"   + thie.index,
					treeId  = "myTree" + thie.index;
				thie.select2InitZtree(modalId,treeId);
			}
		},
		hide  : function(callback){
			var mid = 'openPersonDiv'+this.rand,
				sid = 'backValue'+this.rand,
				tid = 'tree'+this.index;
			if(this.option.isPersonOrOrg){
				SelectControl.personClose(mid,sid);
			}else{
				SelectControl.orgClose(tid,this.option.controlId);
			}
			if(typeof callback === 'function'){
				setTimeout(function(){callback();},350);
			}
		},
		setData : function(str){
			var opt = this.option,
				cacheData = opt.isPersonOrOrg?this.userCacheData:this.orgCacheData,
				datas     = [];
			//处理在ie下有时因执行顺序导致回显不显示问题
			setTimeout(function(){
				if(typeof str === 'string'){
					var items = str.split(",");
					for(var i=0;i<items.length;i++){
						var id = items[i];
						for(var j=0;i<cacheData.length;j++){
							if(cacheData[j].id == id){
								datas.push({id:id, text:cacheData[j].text});
								break;
							}
						}
					}
					$('#'+opt.controlId).select2("data", (datas.length == 1)?{id:datas[0].id,text:datas[0].text}:datas);
				}else if(typeof str === 'object'){
					$('#'+opt.controlId).select2("data", str);
				}
				SelectControl.openPutAwayClear(opt.controlId);
			},0);
		},
		//拼装人员dom树
		getPersonDom: function() {
			var thie = this,
				opt = thie.option;
			var modalDivId = "openPersonDiv" + this.rand, 		//人员层DivId
				personBtnId = "openPersonBtn" + this.rand, 		//人员按钮ID
				selectBackValueId = "backValue" + this.rand, 	//select下拉控件ID
				allPersonBtnId = "allPersonBtn" + this.rand, 	//全选按钮ID
				okPersonBtnId = "okPersonBtn" + this.rand, 		//确认按钮ID
				searchBtnId = "searchBtn" + this.rand,
				searchInputId = "searchInput" + this.rand,
				typeList = "typeList" + this.rand,
				clearBtnId = "clearBtn" + this.rand;
			//输入框与选择按钮界面
			var pCheck = ['<div class="select2-wrap input-group w-p100">'];
			pCheck.push('<div class="fl w-p100">');
			pCheck.push('<input type="hidden" id="' + opt.controlId + '" name="' + opt.controlId.split("-")[1] + '" style="width:100%" ' + (opt.isReadonly ? "disabled" : "") + '/></div>');
			pCheck.push('<a class="btn btn-file no-all input-group-btn" ' + (opt.isReadonly ? 'style="cursor:default"' : "href='###' id='" + personBtnId + "'") + '>');
			pCheck.push('<i class="fa ' + (opt.isCheckOrRadio ? "fa-users" : "fa-user") + '"></i>');
			pCheck.push('</a>');
			pCheck.push(SelectControl.getZhaiKaiDom(clearBtnId));

			var pRadio = ['<div class="select2-wrap input-group w-p100">'];
			pRadio.push('<input type="hidden" id="' + opt.controlId + '" name="' + opt.controlId.split("-")[1] + '" style="width:100%" ' + (opt.isReadonly ? "disabled" : "") + '/>');
			pRadio.push('<a class="btn btn-file no-all input-group-btn" ' + (opt.isReadonly ? 'style="cursor:default"' : "href='###' id='" + personBtnId + "'") + '>');
			pRadio.push('<i class="fa ' + (opt.isCheckOrRadio ? "fa-users" : "fa-user") + '"></i>');
			pRadio.push('</a>');

			var pModal = ['<div class="modal fade" id="' + modalDivId + '" aria-hidden="false" openPersonNum="' + thie.rand + '">',
							'<div class="modal-dialog w1100 modal-tree" style="padding-top: 8%;">',
								'<div class="modal-content">',
									'<div class="modal-header clearfix">',
										'<button type="button" class="close" data-dismiss="modal" onclick="JCTree.personClose(\'' + modalDivId + '\',\'' + searchInputId + '\');">×</button>',
										'<h4 class="modal-title fl">人员选择</h4>',
										'<div class="fl btn-group form-btn m-l-lg" data-toggle="buttons" id="'+typeList+'">',
											'<button type="button" name="line" 		  class="btn m-r-sm"> 在线人员</button>',
											'<button type="button" name="dept" 		  class="btn m-r-sm dark"> 根据组织</button>',
											'<button type="button" name="post" 		  class="btn m-r-sm"> 根据职务</button>',
											'<button type="button" name="personGroup" class="btn m-r-sm"> 个人组别</button>',
											'<button type="button" name="publicGroup" class="btn m-r-sm"> 公共组别</button>',
										'</div>',
										'<form role="search" class="fr input-append m-b-none m-r-lg">',
											'<span class="add-on">按姓名</span> ',
											'<input id="' + searchInputId + '" class="form-control m-r-sm" onKeydown="JCTree.searchKeydown();">',
											'<button type="button" class="btn" id="' + searchBtnId + '">',
												'<i class="fa fa-search"></i>',
											'</button>',
										'</form>',
									'</div>',
									'<div class="loading hide" id="dataLoad' + modalDivId + '"></div>',
									'<div class="modal-body clearfix" id="modal_' + modalDivId + '"></div>',
									'<div class="modal-footer form-btn">',
										'<button id="' + okPersonBtnId + '" class="btn dark" type="button">确 定</button>'+
										(opt.isCheckOrRadio?'<button id="' + allPersonBtnId + '" class="btn" type="button" >全 选</button>':''),
										'<button id="close" class="btn" type="button" onClick="JCTree.personClose(\'' + modalDivId + '\',\'' + searchInputId + '\');">取 消</button>',
									'</div>',
								'</div>',
							'</div>',
						'</div>'];
			if(thie.$controlDivId){
				//页面dom装填
				thie.$controlDivId.append(opt.isCheckOrRadio?pCheck.join(''):pRadio.join(''));
			}
			//初始化select2和数据
			thie.initPersonData(opt.controlId, modalDivId, selectBackValueId);

			JCTree.getModalBody().append(pModal.join(''));
			
			thie.dataLoad = $('#dataLoad'+modalDivId);
			//打开显示层事件
			$("#"+personBtnId).on("click", function(){
				thie.openPerson(opt.isCheckOrRadio, modalDivId, selectBackValueId, opt.controlId);
			});
			//清空按钮事件
			if(opt.isCheckOrRadio){
				$("#"+clearBtnId).bind("click", function(){
					thie.clearValue();
					if(typeof resetPostscript == 'function'){
						resetPostscript();
					}
				});
			}
			//确定按钮
			$('#'+okPersonBtnId).on('click', function(){
				thie.showPersonValue(opt.controlId, selectBackValueId, opt.isCheckOrRadio,modalDivId);
			});
			//全选事件
			$('#'+allPersonBtnId).on('click',function(){
				thie.selectAllCheckbox(modalDivId,selectBackValueId);
			});
			//搜索事件
			$('#'+searchBtnId).on('click',function(){
				thie.search(searchInputId);
			});
			//切换组别事件
			$("#"+typeList).on('click','button',function(){
				thie.switchingType(this,searchInputId,modalDivId,selectBackValueId);
			});
		},
		//拼装组织树
		getOrgDom: function() {
			var thie = this,
				opt  = thie.option,
				orgObj = {
					treeId 		: "tree"   + thie.index,//DivID
					myTreeId	: "myTree" + thie.index,//树控件ID
					orgbtnId 	: "orgbtn" + thie.index,//组织按钮ID
					openBtnId 	: "open"   + thie.index,//打开按钮ID
					clearBtnId 	: "clearBtn" + thie.index
				};
			/**
			 * 组织树界面
			 */
			var orgDom = ['<div class="modal fade" id="'+orgObj.treeId+'" aria-hidden="false">',
							'<div class="modal-dialog">',
								'<div class="modal-content">',
									'<div class="modal-header">',
										'<button type="button" class="close" data-dismiss="modal">×</button>',
										'<h4 class="modal-title">选择</h4>',
									'</div>',
									'<div class="loading hide" id="treeLoad' + orgObj.myTreeId + '"></div>',
									'<div class="modal-body">',
										'<div id="'+orgObj.myTreeId+'" class="ztree"></div>',
									'</div>',
									'<div class="modal-footer no-all form-btn">',
										'<button class="btn dark" type="button" id="'+orgObj.orgbtnId+'">确 定</button>',
										'<button class="btn" type="reset" id="close" onClick="JCTree.orgClose(\''+orgObj.treeId+'\',\''+opt.controlId+'\');">取 消</button>',
									'</div>',
								'</div>',
							'</div>',
						'</div>'];
			/**
			 * 输入框与选择按钮界面[组织控件主界面]
			 */
			var pageDom = ['<div class="select2-wrap input-group w-p100">'];
			if(opt.isCheckOrRadio)pageDom.push('<div class="fl w-p100">');//btn-in-area 
			pageDom.push('<input type="hidden" id="'+opt.controlId+'" name="'+opt.controlId.split("-")[1]+'" search="search" style="width:100%"  '+(opt.isReadonly?"disabled":"")+'/>');
			if(opt.isCheckOrRadio)pageDom.push('</div>');
			pageDom.push('<a class="btn btn-file no-all input-group-btn" '+(opt.isReadonly?"style='cursor: default;'":"")+' href="###"');
			if(!opt.isReadonly){
				pageDom.push('id="'+orgObj.openBtnId+'" role="button"');
			}
			pageDom.push('><i class="fa fa-group"></i></a>');
			if(opt.isCheckOrRadio){
				pageDom.push(SelectControl.getZhaiKaiDom(orgObj.clearBtnId));
			}else{
				pageDom.push('</div><label class="help-block hide"></label>');
			}
			if(thie.$controlDivId){
				thie.$controlDivId.append(pageDom.join(''));
			}
			JCTree.getModalBody().append(orgDom.join(''));

			thie.dataLoad = $('#treeLoad'+orgObj.myTreeId);

			if(!thie.orgCacheData.length){
				thie.initOrgData();
			}
			//清空按钮事件
			if(opt.isCheckOrRadio){
				$("#"+orgObj.clearBtnId).bind("click", function(){
					thie.clearValue();
					if(typeof resetPostscript == 'function'){
						resetPostscript();
					}
				});
			}
			$('#'+orgObj.openBtnId).on('click',function(){
				thie.select2InitZtree(orgObj.treeId,orgObj.myTreeId);
			});

			$('#'+orgObj.orgbtnId).on('click',function(){
				thie.showOrgValue(orgObj.treeId,orgObj.myTreeId);
			});
		},
		/**
		 * [initPersonData 初始化人员数据和select2]
		 * @param  {[type]} controlId         [控件ID]
		 * @param  {[type]} personBtnId       [人员按钮ID]
		 * @param  {[type]} modalDivId   	  [弹出层ID]
		 * @param  {[type]} selectId  		  [选择框ID]
		 */
		initPersonData : function(controlId, modalDivId, selectId){
			var thie = this,
				opt  = thie.option;
			if(!thie.deptCacheData.length){
				//查询人员数据用于搜索
				//这里使用同步ajax 否则下边的静态方法获取不到thie.deptCacheData
				$.ajax({
					async : (opt.container?true:false),
					url : opt.urls.user,
					type : 'GET',
					success : function(data) {		
						var datas = thie.deptCacheData = JSON.parse(data)[0];
						if (datas && datas.subDept) {
							thie.getAllUser(datas.subDept, thie.userCacheData);	
						}
					},
					error: function(){
						msgBox.tip({content: "获取人员失败", type:'fail'});
					}
				});
			}
			thie.select2InitToPerson(thie.userCacheData,controlId,opt.isCheckOrRadio,opt.echoData,opt.callback);
		},
		/**
		 * [initOrgData 初始化组织数据]
		 * @return {[type]} [description]
		 */
		initOrgData : function(){
			var thie = this,
				opt  = thie.option,
				orgType = opt.orgOrDept;

			function znode(node){
				var falg = false;
				if(orgType == 'org'){
					falg = node == 0 ? true : false;
				}else if(orgType == 'dept'){
					falg = node == 1 ? true : false;
				}else{
					falg = false;
				}
				return falg;
			}
			$.ajax({
				async: (opt.container?true:false),
				url : orgType === 'onlyOrg'?opt.urls.orgNoDept:opt.urls.org,
				type : 'get',
				success : function(data) {
					if(data){
						for(var i = 0,len = data.length;i < len;i++){
							var o = data[i];
							thie.orgCacheData.push({
								id : o.id,						//ID
								text : o.name,					//显示的内容
								queue: o.queue,					//排序
								parentId: o.parentId,			//组织父节点
								deptType: o.deptType,			//组织类型
								isChecked: o.isChecked,			//是否选中
								jp: Pinyin.GetJP(o.name)		//汉字的简拼
							});

							thie.ztreeCacheData.push({
								id : o.id,
								pId : o.parentId,
								name : o.name,
								deptType : o.deptType,
								chkDisabled : znode(o.deptType),
								isChecked: o.isChecked
							});
						}
					}
					thie.select2InitToOrg(thie.orgCacheData);
				},
				error: function(){
					msgBox.tip({content: "获取组织失败", type:'fail'});
				}
			});
		},
		openPerson : function(isCheckOrRadio, modalDivId, selectId, controlId){
			this.actions.dept.call(this,modalDivId, selectId, isCheckOrRadio, $("#"+controlId).select2("data"));
			$('#'+modalDivId).modal('show').find('button[name="dept"]').addClass('dark').siblings().removeClass("dark");
		},
		actions : {//1005
			//根据在线人员
			line : function(modalDivId,selectId){
				this.getAjaxData(modalDivId,selectId,'line');
			},
			//根据组织
			dept : function(modalDivId,selectId){
				$('#modal_'+modalDivId).css('height','300px');
				var thie = this,
					opt  = thie.option,
					data = $('#'+opt.controlId).select2('data');
				thie.loading('show');
				SelectControl.openPutAwayClear(opt.controlId);
				//延时300 填充人员，避免人员数量大时页面长时间没响应
				setTimeout(function(){
					thie.showUserPage(thie.deptCacheData, selectId, modalDivId, opt.isCheckOrRadio);
					thie.switching(modalDivId, selectId, opt.isCheckOrRadio, (thie.$controlDivId?data:null));
				},300);
			},
			//根据职务
			post : function(modalDivId,selectId){
				this.getAjaxData(modalDivId,selectId,'post');
			},
			//个人组别
			personGroup : function(modalDivId,selectId){
				this.getAjaxData(modalDivId,selectId,'personGroup');
			},
			//公共组别
			publicGroup : function(modalDivId,selectId){
				this.getAjaxData(modalDivId,selectId,'publicGroup');
			}
		},
		/**
		 * [getAjaxData 不同类型组别获取数据]
		 * @param  {[type]} url        [description]
		 * @param  {[type]} modalDivId [description]
		 * @param  {[type]} selectId   [description]
		 */
		getAjaxData : function(modalDivId,selectId,type){
			var thie = this,
				opt  = thie.option;
			thie.loading('show');
			$.ajax({
				url : opt.urls[type],
				type : 'get',
				success : function(data) {
					//这里不要用JSON.parse(data)[0]因为有些数据根目录可能有多条
					switch(type){
						case 'line':
							thie.showUserPage(JSON.parse(data)[0], selectId, modalDivId, opt.isCheckOrRadio,type);
							break;
						case 'post':
							thie.showGroupPage(JSON.parse(data), selectId, modalDivId, opt.isCheckOrRadio,'user');
							break;
						case 'personGroup':
						case 'publicGroup':
							thie.showGroupPage(JSON.parse(data), selectId, modalDivId, opt.isCheckOrRadio,'group');
							break;
						default :
							thie.showUserPage(JSON.parse(data)[0], selectId, modalDivId, opt.isCheckOrRadio);
					}
					thie.loading('hide');
				},
				error: function(){
					thie.loading('hide');
					msgBox.tip({content: "获取个人组别失败", type:'fail'});
				}
			});
		},
		/**
		 * [showPersonValue 人员回显[回写值]]
		 * @return {[type]} [description]
		 */
		showPersonValue : function(controlId,selectId,isCorR,modalId){
			var thie  = this,
				users = [];
			$("#"+selectId).find("option").each(function(i, val){
				var gv = val.value.split(",");
				users[i] = {
					id: gv[0],
					text: val.text
				};
		    });
			if(users.length > 0){
				$("#"+controlId).select2("data", (isCorR?users:{id: users[0].id, text: users[0].text}));//回显
			}else{
				msgBox.info({content:'请选择人员',type:'fail'});
				return false;
			}
			thie.removeValidSelect2(controlId, isCorR);
			SelectControl.openPutAwayClear(controlId);
			thie.setFocus(controlId);
			if(typeof thie.option.callback === 'function'){// && 
				if(thie.$controlDivId){
					if(isCorR)thie.option.callback.call(thie,users);
				}else{
					thie.option.callback.call(thie,users);
				}
			}
			if(modalId){
				$('#'+modalId).modal('hide');
			}
			return users;
		},
		/**
		 * [showOrgValue 组织回显]
		 * @param  {[type]} modalId [description]
		 * @param  {[type]} treeId  [description]
		 * @return {[type]}         [description]
		 */
		showOrgValue : function(modalId,treeId){
			var thie = this,
				opt  = thie.option,
				$tree = $.fn.zTree.getZTreeObj(treeId);
				nodes = $tree.getChangeCheckedNodes();
			if(nodes.length == 0){
				$("#"+modalId).modal("hide");
				thie.clearValue();
				return false;
			}
			var rov = [];//人员控件返回的数据集合
			$.each(nodes,function(i, val){
				rov[i] = {
					id: this.id,
					text: this.name
				};
			});
			if(opt.isCheckOrRadio){
				$("#"+opt.controlId).select2("data", rov);//多选回显值
			}else{
				if(rov.length > 0){
					$("#"+opt.controlId).select2("data", {id: nodes[0].id, text: nodes[0].name});//单选回显值
				}
			}
			thie.removeValidSelect2(opt.controlId, opt.isCheckOrRadio);
			SelectControl.openPutAwayClear(opt.controlId);
			if(typeof thie.option.callback === 'function'){
				opt.callback.call(thie,rov);
			}
			$("#"+modalId).modal("hide");
		},
		setFocus : function(id){
			$("#s2id_input_"+id).focus();
		},
		/**
		 * [showUserPage 显示人员]
		 * @param  {[Object]}  eData          [人员数据]
		 * @param  {[String]}  selectId       [select的ID]
		 * @param  {[String]}  modalDivId     [弹出层DIVID]
		 * @param  {Boolean}   isCheckOrRadio [单选或多选]
		 * @param  {String}    type 		  [显示人员类型]
		 */
		showUserPage : function(eData, selectId, modalDivId, isCheckOrRadio,type){
			var thie  = this,
				dList = ['<div>'], 
				uList = ['<div>'];
			if(eData){
				if(eData.length){
					//成立的话就是有多个根节点
					for (var i = 0,len = eData.length;i < len; i++) {
						var dydata = eData[i];
						dList.push((isCheckOrRadio?'<label class="checkbox fl"><input type="checkbox" id="dept'+dydata.id+'" name="depts" onClick="JCTree.addSelect(this,'+selectId+','+modalDivId+')"> <span class="fl w100">'+dydata.name+'</span></label> ':'<label class="radio fl"><span class="fl w100">'+dydata.name+'</span></label> '));
						
						uList.push(thie.joinString(dydata.user,isCheckOrRadio,selectId,modalDivId,((type == 'line')?'#60AAE9':'')));
					}
				}else{
					if(eData.user && eData.user.length > 0){
						dList.push((isCheckOrRadio?'<label class="checkbox fl"><input type="checkbox" id="dept'+eData.id+'" name="depts" onClick="JCTree.addSelect(this,'+selectId+','+modalDivId+')"> <span class="fl w100">'+eData.name+'</span></label> ':'<label class="radio fl"><span class="fl w100">'+eData.name+'</span></label> '));
						uList.push(thie.joinString(eData.user,isCheckOrRadio,selectId,modalDivId,((type == 'line')?'#60AAE9':'')));
					}else{
						dList.push('<label class="checkbox fl"><span class="fl w100">'+eData.name+'</span></label> ');
						uList.push('<label class="checkbox inline"></label>');
					}
				}
				uList.push('</div>');
				dList.push('<a href="#" class="fr m-r tree-btn" onclick="JCTree.dataTreeToogle(this);"><i class="fa fa-chevron-up"></i></a></div>');
			}else{
				dList.push('<label class="fl"><span class="fl w100"></span></label></div> ');
				uList.push('<div style="text-align:center;">'+$.i18n.prop("JC_SYS_007")+'</div>');
			}
			var showlist = $(
				'<section class="w820 fl tree-ul tree-scroll" id="searchVessel'+thie.rand+'">' +
					'<ul class="tree-horizontal clearfix">' +
						'<li>'+
						'<div class="level1 clearfix tree-list">' +
							dList.join('') +
							uList.join('') +
						'</div>'+
						'<ul id="lv"></ul>'+
						'</li>'+
					'</ul>'+
				'</section>'+
				'<section class="fl m-l pos-rlt">'+
					'<select id="'+selectId+'" name="'+selectId+'" multiple="false" class="w170 tree-scroll-right tree-select">'+
		            '</select>'+
		            '<div class="tree-sort"><a href="#" onClick="sort(\''+selectId+'\');"><i id="sort" class="fa fa-sort-shang"></i></a></div>'+
		            '<div class="tree-move"> '+
		            	'<a href="#" class="tree-move-up" onClick="up(\''+selectId+'\');"><i class="fa fa-caret-up"></i></a> '+
		            	'<a href="#" class="tree-move-down" onClick="down(\''+selectId+'\');"><i class="fa fa-caret-down"></i></a> '+
		            '</div>'+
		        '</section>'
			);
			$("#modal_"+modalDivId).html(showlist);
			if(eData && eData.subDept && eData.subDept.length > 0){
				thie.recur(eData.subDept, showlist.find("#lv"), 2, selectId, modalDivId, isCheckOrRadio,type);
			}
			//return showlist;
		},
		showGroupPage : function(eData, selectId, modalDivId, isCheckOrRadio,type){
			var thie  = this;
			var list = [];
			if(eData.length){
				for (var i = 0,len = eData.length;i < len; i++) {
					var dList = ['<div>'], 
						uList = ['<div>'],
					 	dydata = eData[i];
					list.push('<li><div class="level1 clearfix tree-list" style="'+((i>0)?"  border-top: 0 !important;":"")+'">');
					dList.push((isCheckOrRadio?'<label class="checkbox fl"><input type="checkbox" id="dept'+dydata.id+'" name="depts" onClick="JCTree.addSelect(this,'+selectId+','+modalDivId+')"> <span class="fl w100">'+dydata.name+'</span></label> ':'<label class="radio fl"><span class="fl w100">'+dydata.name+'</span></label> '));
					uList.push(thie.joinString(dydata[type],isCheckOrRadio,selectId,modalDivId));
					dList.push('</div>');
					uList.push('</div>');
					list.push(dList.join('') + uList.join('') + '</div></li>');
				}
			}else{
				list.push('<div style="text-align:center;">'+$.i18n.prop("JC_SYS_007")+'</div>');
			}
			var showlist = ['<section class="w820 fl tree-ul tree-scroll" id="searchVessel'+thie.rand+'">' ,
								'<ul class="tree-horizontal clearfix">' ,
									list.join('') ,
								'</ul>',
							'</section>',
							'<section class="fl m-l pos-rlt">',
								'<select id="'+selectId+'" name="'+selectId+'" multiple="false" class="w170 tree-scroll-right tree-select">',
								'</select>',
								'<div class="tree-sort"><a href="#" onClick="sort(\''+selectId+'\');"><i id="sort" class="fa fa-sort-shang"></i></a></div>',
								'<div class="tree-move"> ',
									'<a href="#" class="tree-move-up" onClick="up(\''+selectId+'\');"><i class="fa fa-caret-up"></i></a> ',
									'<a href="#" class="tree-move-down" onClick="down(\''+selectId+'\');"><i class="fa fa-caret-down"></i></a> ',
								'</div>',
							'</section>'];
			$('#modal_'+modalDivId).html(showlist.join(''));
			//return showlist;
		},
		/**
		 * [recur 	递归查询下级菜单]
		 * @param  {[type]}  deptList        [部门数据集合]
		 * @param  {[type]}  parentHtml      [上级html]
		 * @param  {[type]}  level           [level-css样式]
		 * @param  {[type]}  selectId        [select的ID]
		 * @param  {[type]}  modalId 		 [弹出层DIVID]
		 * @param  {Boolean} isCrR  		 [单选或多选]
		 */
		recur : function(deptList,  parentHtml, level, selectId, modalId, isCrR,type){
			var thie = this,
				dLen = deptList.length;
			for (var i = 0; i < dLen; i++) {
				var di = deptList[i];
				thie.delayed(di,parentHtml, level, selectId, modalId, isCrR,type);
			}
		},
		delayed : function(di,parentHtml, level, selectId, modalId, isCrR,type){
			var thie = this;
			if(di.subDept){
					var mDept = ['<div>'],
						mUser = ['<div>'];
					if(di && di.user.length > 0){
						mDept.push(isCrR?'<label class="checkbox fl"><input type="checkbox" id="' + di.id + '" name="depts" onClick="JCTree.addSelect(this,\'' + selectId + '\',\'' + modalId + '\')"> <span class="fl w100">' + di.name + '</span></label> ':'<label class="radio fl"><span class="fl w100">' + di.name + '</span></label> ');
						mUser.push(thie.joinString(di.user, isCrR, selectId, modalId, ((type == 'line')?'#60AAE9':'')));
					}else{
						mDept.push('<label class="checkbox fl"><span class="fl w100">' + di.name + '</span></label> <label class="checkbox inline"></label>');
					}
					mDept.push('<a href="#" class="fr m-r tree-btn" onclick="JCTree.dataTreeToogle(this);"><i class="fa fa-chevron-up"></i></a></div>');
					mUser.push('</div>');
					var mSub = $([
							'<li>',
								'<div class="level' + level + ' clearfix tree-list">',
									mDept.join(''),
									mUser.join(''),
								'</div>',
								'<ul id="lv' + i + '"></ul>',
							'</li>'
					].join(''));

					mSub.appendTo(parentHtml);
					thie.recur(di.subDept, mSub.children().last(), level + 1, selectId, modalId, isCrR,type);
				}else{
					var sDept = ['<div>'],
						sUser = ['<div>'];
					if(di.user && di.user.length > 0){
						sDept.push(isCrR?'<label class="checkbox fl"><input type="checkbox" id="' + di.id + '" name="depts" onClick="JCTree.addSelect(this,\'' + selectId + '\',\'' + modalId + '\')"> <span class="fl w100">' + di.name + '</span></label> ':'<label class="radio fl"><span class="fl w100">' + di.name + '</span></label> ');
						sUser.push(thie.joinString(di.user, isCrR, selectId, modalId, ((type == 'line')?'#60AAE9':'')));
					}else{
						sDept.push('<label class="checkbox fl"><span class="fl w100">' + di.name + '</span></label> ');
						sUser.push('<label class="checkbox inline"></label>');
					}
					sDept.push('</div>');
					sUser.push('</div>');
					var sSub = ['<li>',
								'<div class="level' + level + ' clearfix tree-list">',
									sDept.join(''),
									sUser.join(''),
								'</div>',
							'</li>'].join('');
					parentHtml.append(sSub);

				}
		},
		/**
		 * 拼装字符串
		 * @param  obj				数据集合
		 * @param  isCheckOrRadio	单选或多选
		 * @param  selectId			select的ID
		 * @param  modalDivId		弹出层DIVID
		 * @param  color			字体颜色
		 */
		joinString : function(obj,isCheckOrRadio,selectId,modalDivId,color){
			var len  = obj.length,
		    	i    = 0,
		    	arys = new Array();
		    for(; i<len; i++){
		        var temp = obj[i];
		        arys.push('<label class="'+((isCheckOrRadio)?"checkbox":"radio")+' inline"> '+
		        	'<input type="'+((isCheckOrRadio)?"checkbox":"radio")+
		        	'" id="'+temp.id+
		        	'" dept="'+temp.deptId+
		        	'" name="'+((isCheckOrRadio)?temp.id:'radioUser')+
		        	'" value="'+temp.id+','+temp.displayName+','+((isCheckOrRadio)?temp.orderNo:"")+
		        	'" onClick="JCTree.addSelect(this,\''+selectId+'\',\''+modalDivId+'\')"> '+
		        '<a href="#" onclick="JCTree.showPersonInfo('+temp.id+');"><span style="color:'+((color)?color:"")+'">'+temp.displayName+'</span></a></label> ');
		    }
		    return arys.join('');
		},
		/**
		 * [switching 按钮切换调用]
		 * @param  {[type]}  ModalId        [description]
		 * @param  {[type]}  selectId       [description]
		 * @param  {Boolean} isCheckOrRadio [description]
		 * @param  {[type]}  eData          [description]
		 */
		switching : function(ModalId, selectId, isCheckOrRadio, eData){
			var thie    = this;
			if(isCheckOrRadio){
				if(eData)thie.checkAddSelect(ModalId,selectId,eData);
			}else{
				thie.radioAddSelect(ModalId,selectId,eData);
			}
			$('#modal_'+ModalId).css('height','');
			thie.loading('hide');
		},
		/**
		 * [switchingType 切换人员组别]
		 * @param  {[Dom]}    ele      [description]
		 * @param  {[String]} searchId [搜索框id]
		 * @param  {[String]} modalId  [显示层id]
		 * @param  {[String]} selectId [select框id]
		 */
		switchingType : function(ele,searchId,modalId,selectId){
			var thie = this,
				type = ele.name,
				$obj = $(ele);
			$("#"+searchId).val("");
			$obj.siblings().removeClass("dark");
			if(thie.checkSelectIsNull(modalId, selectId)){
				msgBox.confirm({
				 	content: "确定放弃当前所选择的人员？", 
				 	type: 'fail', 
				 	success: function(){
				 		$obj.addClass("dark");
				 		thie.clearValue();
				 		thie.actions[type].call(thie,modalId, selectId);
				 	}
				});
			}else{
				$obj.addClass("dark");
				thie.actions[type].call(thie,modalId, selectId);
			}
		},
		//
		checkAddSelect : function(modalId,selectId,eData){
			//获取所有的input标签对象,取出所有的checkbox
			var thie = this,
				dom  = null,
				$modal = $('#'+modalId);
			$modal.find(":checkbox").prop("checked", false);
			thie.clearAllUser(selectId);
			if(eData.length){
				for(var i = 0,len = eData.length;i < len;i ++){
					dom = $modal.find("[name='"+eData[i].id+"']");
					dom.prop("checked", true);
					SelectControl.addSelect(dom[0],selectId,modalId);
				}
			}else{
				if(eData){
					dom = $modal.find("[name='"+eData.id+"']");
					dom.prop("checked", true);
					SelectControl.addSelect(dom[0],selectId,modalId);
				}
			}
		},
		//modalId,selectId,eData
		radioAddSelect : function(modalId,selectId,eData){
			var thie = this,
				dom  = null,
				openDiv = $('#'+modalId);
			//如果是radio
			if(eData){
				if(eData.id){
					dom = openDiv.find('#'+eData.id);
					dom.prop("checked", true);
					SelectControl.addSelect(dom[0],selectId,modalId);
				}else{
					msgBox.tip({content: "单选回显参数不能用数组形式！！！", type:'fail'});
					return false;
				}
			}
		},

		selectAllCheckbox : function(modalId,selectId){
			var thie = this,
				opt  = thie.option,
				boxs = $('#'+modalId).find(':checkbox'),
				$select = $('#'+selectId),
				results = [];
			thie.selectBoxs = !thie.selectBoxs;
			for(var i = 0,len = boxs.length;i < len;i++){
				var box = boxs[i];
				if(box.name != 'depts'){
					var val = box.value.split(",");
					results.push("<option value='"+val[0]+","+val[2]+"'>"+val[1]+"</option>");
				}
				box.checked = thie.selectBoxs;
			}
			thie.clearAllUser(selectId);
			if(thie.selectBoxs){
				$select.append(results.join(''));
			}
		},
		/**
		 * [clearAllUser 清空已选中数据]
		 * @param  {[type]} selectId [select区域id]
		 */
		clearAllUser : function(selectId){
			$("#"+selectId).empty();
		},
		/**
		 * [search 搜索人员]
		 * @param  {[String]} searchInputId [搜索输入框id]
		 * @param  {[String]} modalId       [显示层id]
		 */
		search : function(searchId){
			var thie 	 = this,
				siv 	 = $("#"+searchId).val(),			//搜索框
			 	container= $("#searchVessel"+thie.rand), 	//人员显示列表容器
				len 	 = thie.searchResultData.length;	//上次搜索结果
			/**
			 * [setSearchPosition 设置已搜索到人员滚动条位置]
			 * @param {[jQuery]} parent [容器]
			 * @param {[jQuery]} obj    [当前搜索到的对象]
			 */
			function setSearchPosition(parent,obj){
				parent.scrollTop(Math.abs(obj.offset().top + parent.scrollTop() - parent.offset().top)-100);
			}
			if(!thie.searchCacheData.length){
				thie.searchCacheData = container.find('span:not([class])');
			}
			if(len){
				for(var i = 0; i < len; i++){
					thie.searchResultData[i].style.color = "#555";
				}
				thie.searchResultData = [];
			}
			if(!!siv){
				for (var i = 0; i < thie.searchCacheData.length; i++) {
			          var thay = thie.searchCacheData[i],
			              text = thay.innerText;
			              if(text.indexOf(siv) != -1){
			            	  thie.searchResultData.push(thay); 
			            	  setSearchPosition(container,$(thay));
			            	  thay.style.color = "#F4A642";
			              }
			    }
			}
		},
		/**
		 * [select2InitToPerson 初始化人员树]
		 * @param  {[type]}   cacheData      [description]
		 * @param  {[type]}   controlId      [description]
		 * @param  {Boolean}  isCheckOrRadio [description]
		 * @param  {[type]}   echoData       [description]
		 * @param  {Function} callback       [description]
		 * @return {[type]}                  [description]
		 */
		select2InitToPerson : function(cacheData, controlId, isCheckOrRadio, echoData, callback){
			$("#"+controlId).select2({
			    placeholder	: '',						//水印提示
			    allowClear	: true,						//允许清除
			    maximumInputLength:	10,					//最大输入长度
			    isDisabled	: false,
			    seledFun	: (typeof callback === 'function'?callback:undefined),
			    multiple	: isCheckOrRadio,//单选or多选
			    query: function (query){
			        var data = {results: []};
			        if(cacheData.length > 0){
			        	$.each(cacheData, function(){
				            if(query.term.length == 0 || this.text.toUpperCase().indexOf(query.term.toUpperCase()) >= 0 
				            		|| this.jp.toUpperCase().indexOf(query.term.toUpperCase()) >= 0){
				                data.results.push({id: this.id, text: this.text});
				            }
				        });
			        }
			        query.callback(data);
			    }
			});
			if(echoData){
				$("#"+controlId).select2("data", echoData);
			}
			SelectControl.openPutAwayClear(controlId);
		},
		/**
		 * [select2InitToOrg 初始化组织树]
		 * @param  {[type]}  orgData        [组织数据*已拼装好的]
		 */
		select2InitToOrg : function(orgData){
			var thie = this,
				opt  = thie.option;
			$("#"+opt.controlId).select2({
			    placeholder	: " ",						//文本框占位符显示
			    allowClear	: true,						//允许清除
			    maximumInputLength: 10,					//最大输入长度
			    seledFun	: (typeof opt.callback === 'function'?opt.callback:undefined),
			    multiple	: opt.isCheckOrRadio,			//单选or多选
			    query 		: function (query){
			        var data = {results: []};
			        $.each(orgData, function(){
			            if(query.term.length == 0 || this.text.toUpperCase().indexOf(query.term.toUpperCase()) >= 0
			            		|| this.jp.toUpperCase().indexOf(query.term.toUpperCase()) >= 0){
			            	if(opt.orgOrDept == 'org'){
			            		data.results.push({id: this.id, text: this.text, disabled: this.deptType==1 && this.isChecked==1?false:true});
			            	}else if(opt.orgOrDept == 'dept'){
			            		data.results.push({id: this.id, text: this.text, disabled: this.deptType==0 && this.isChecked==1?false:true});
			            	}else{
			            		data.results.push({id: this.id, text: this.text, disabled: this.isChecked==1?false:true});
			            	}
			            }
			        });
			        query.callback(data);
			    }
			});
			if(opt.echoData){
				$("#"+opt.controlId).select2("data", opt.echoData);
			}
			SelectControl.openPutAwayClear(opt.controlId);
		},
		/**
		 * [select2InitZtree 初始化ztree]
		 * @param  {[type]} modalId [description]
		 * @param  {[type]} treeId  [description]
		 */
		select2InitZtree : function(modalId,treeId){
			var thie = this,
				opt  = thie.option;
			/**
			 * tree控件的设置[单选][默认]
			 */
			var settingRadio = {
				check:{
					enable: true,
					nocheckInherit: true,
					chkStyle: "radio",
					radioType : "all"
				},
				view:{
					selectedMulti: false,
					showLine: false
				},
				data:{
					simpleData:{
						enable:true
					}
				},
				callback:{
					beforeClick: function(id, node){
						return false;
					}
				}
			};

			/**
			 * tree控件的设置[多选]
			 */
			var settingCheck = {
				check:{
					enable: true,
					chkStyle: "checkbox",
					chkboxType: { "Y" : "s", "N" : "ps" }
				},
				view:{
					selectedMulti: false,
					showLine: false
				},
				data:{
					simpleData:{
						enable:true
					}
				},
				callback:{
					beforeClick: function(id, node){}
				}
			};
			var zTreeObject = $.fn.zTree.init($("#"+modalId+" #"+treeId), opt.isCheckOrRadio ? settingCheck : settingRadio, thie.ztreeCacheData);

			zTreeObject.expandAll(true);

			var eData = thie.returnOrgValue(opt.controlId);
			if(eData){
				$.each(eData.split(","),function(i, v){
					var node = zTreeObject.getNodeByParam("id", v.split(":")[0], null);
					if(node) zTreeObject.checkNode(node, true, false);
				});
			}
			$("#"+modalId).modal("show");

		},
		//递归循环添加人员
		getAllUser : function(dept, data){
			function recursion(d, arrays){
				if (d) {
					var dLen = d.length;
					for (var i = 0; i < dLen; i++) {
						var di = d[i];
						if (di.user) {
							var duLen = di.user.length;
							for (var j = 0; j < duLen; j++) {
								var duj = di.user[j];
								arrays.push({
									id: duj.id, //ID
									text: duj.displayName, //显示的内容
									orderNo: duj.orderNo, //排序
									jp: Pinyin.GetJP(duj.displayName) //汉字的简拼
								});
							}
							if (di.subDept) {
								recursion(di.subDept, arrays);
							}
						} else {
							if (di.subDept) {
								recursion(di.subDept, arrays);
							}
						}
					}
				}
			}
			recursion(dept,data);
		},
		/**
		 * [readonly 禁用组件]
		 */
		readonly : function(){
			var opt = this.option,
				id = opt.isPersonOrOrg?('#openPersonBtn'+this.rand):('#open'+this.index);
			$("#"+opt.controlId).select2("readonly", true);
			$(id).css('cursor','default').off();
		},
		/**
		 * [unReadonly 解除禁用状态]
		 * @return {[type]} [description]
		 */
		unReadonly : function(){
			var thie = this,
				opt  = this.option,
				id 	 = opt.isPersonOrOrg?('#openPersonBtn'+this.rand):('#open'+this.index);
			if(opt.isPersonOrOrg){
				var mid  = 'openPersonDiv'+thie.rand,
				    sid  =  'backValue'+thie.rand;
				$(id).css('cursor','pointer').on("click", function(){
					thie.openPerson(opt.isCheckOrRadio, mid, sid, opt.controlId);
				});
			}else{
				var treeId 	= "tree"   + thie.index,
					myTreeId= "myTree" + thie.index;
				$(id).css('cursor','pointer').on('click',function(){
					thie.select2InitZtree(treeId,myTreeId);
				});
			}
			$("#"+opt.controlId).select2("readonly", false);
		},
		returnOrgValue : function (inputId){
			var datas = $("#"+inputId).select2("data"),
				v   = "";
			if(datas == null || datas.length == 0){ return null; }

			if(datas.length > 0){
				$.each(datas, function(j, d){
					v += d.id+":"+d.text+",";
				});
			}else{
				v += datas.id+":"+datas.text+",";
			}
			return v.substring(0, v.length-1);
		},
		/**
		 * [removeValidSelect2 清除验证错误信息]
		 * @param  {[String]}  controlId      [description]
		 * @param  {Boolean}   isCheckOrRadio [description]
		 */
		removeValidSelect2 : function(controlId, isCheckOrRadio){
			var $ele = $("#s2id_"+controlId);
			$ele.removeClass("error"); 
			if(isCheckOrRadio){
				$ele.parent().parent().next(".help-block").html("");
			}else{
				$ele.parent().next(".help-block").html("");
			}
		},
		/**
		 * [checkSelectIsNull 验证人员是否有选中]
		 * @param  {[String]} modalId
		 * @param  {[String]} selectId
		 * @return {[Boolean]} 
		 */
		checkSelectIsNull : function(modalId, selectId){
			var users = [];
			$("#"+modalId+" select[name='"+selectId+"']").find("option").each(function(i, val){
				var gv = val.value.split(",");
				users[i] = {
					id: gv[0],
					text: val.text
				};
		    });
			if(users.length > 0){
				return true;
			}else{
				return false;
			}
		},
		loading : function(type){
			this.dataLoad[type]();
		},
		clearValue : function(){
			var id = this.option.controlId;
			$("#"+id).select2("data","");
			SelectControl.openPutAwayClear(id);
		}
	};
	
	SelectControl.setConfig = function(options){
		options = options || {};
	    for(var i in options){
	    	SelectControl.DEFALUT[i] = options[i];
	    }
	};
	/**
	 * 取消回车搜索
	 */
	SelectControl.searchKeydown = function(){
		var ev = event || window.event;
    	if(ev.keyCode == 13) {
	    	ev.keyCode = 0;
	    	ev.returnValue = false;
	    }
	};
	/**
	 * [showPersonInfo 显示人员详细信息]
	 * @param  {[type]} userId [description]
	 */
	SelectControl.showPersonInfo = function(userId){
		var thie = this,
			url  = this.DEFALUT.urls.findById;
		function getName(name){
			return name?name:'';
		}
		var modalDom = [
			'<div class="modal fade panel" id="showPersonInfo'+thie.index+'" aria-hidden="false">',
				'<div class="modal-dialog">',
					'<div class="modal-content">',
						'<div class="modal-header">',
							'<button type="button" class="close" data-dismiss="modal">×</button>',
							'<h4 class="modal-title">用户基本信息</h4>',
						'</div>',
						'<div class="modal-body dis-table" id="showPersonModal'+thie.index+'" style="max-height: 661.5999999999999px;">',   
						'</div>',
			    	'</div>',
			    '</div>',
			'</div>'
		];
		if(!$("#showPersonInfo"+thie.index).length){
			JCTree.getModalBody().append(modalDom.join(''));	
		}
		$.ajax({
			url : url,
			type : 'post',
			data: {id: userId},
			success : function(data) {
				if(data){
					var infoDom = [
	    				'<section class="dis-table-cell" style="width:162px;">',
	    					'<img src="'+(getRootPath()+(data.photo?'/'+data.photo:'/img/none.jpg'))+'" width="147" height="177">',
	    				'</section>',
	    				'<section class="panel-tab-con dis-table-cell" style="padding-bottom:20px;">',
	    					'<table class="basicMsg" id="pInfo">',
	    						'<tbody>',
	    							'<tr>',
	    								'<td class="w115">用户显示名</td>',
	    								'<td>'+getName(data.displayName)+'</td>',
	    							'</tr>',
	    							'<tr>',
		    							'<td>所在部门</td>',
		    							'<td>'+getName(data.deptName)+'</td>',
	    							'</tr>',
	    							'<tr>',
		    							'<td>职务</td>',
		    							'<td>'+getName(data.dutyIdValue)+'</td>',
	    							'</tr>',
	    							'<tr>',
		    							'<td>级别</td>',
		    							'<td>'+getName(data.levelValue)+'</td>',
	    							'</tr>',
	    							'<tr>',
		    							'<td>用户性别</td>',
		    							'<td>'+getName(data.sexValue)+'</td>',
	    							'</tr>',
	    							'<tr>',
		    							'<td>用户手机号码</td>',
		    							'<td>'+getName(data.mobile)+'</td>',
	    							'</tr>',
	    							'<tr>',
		    							'<td>用户邮箱</td>',
		    							'<td>'+getName(data.email)+'</td>',
	    							'</tr>',
	    							'<tr>',
		    							'<td>用户办公电话</td>',
		    							'<td>'+getName(data.officeTel)+'</td>',
	    							'</tr>',
	    							'<tr>',
		    							'<td>直接领导</td>',
		    							'<td>'+getName(data.leaderIdValue)+'</td>',
	    							'</tr>',
	    						'</tbody>',
	    					'</table>',
	    				'</section>'
					]; 
					$("#showPersonModal"+thie.index).html(infoDom.join(''));
					$("#showPersonInfo"+thie.index).modal("show");
				}
			},
			error: function(){
				msgBox.tip({content: "获取人员详细信息失败", type:'fail'});
			}
		});
	};
	/**
	 * [personClose 关闭人员选择树]
	 * @param  {[type]} modalId  [description]
	 * @param  {[type]} searchId [description]
	 */
	SelectControl.personClose = function(modalId, searchId){
		$("#"+searchId).val("");
		$("#"+modalId).modal("hide");
		// allcheckboxFlag = true;
		// clearInterval(JCTree.userList.timer);
		// $("#"+openPersonDivId).modal("hide");
		// if(isOP != null || isOP != undefined)
		// 	isOpenSinglePerson = true;
	};
	SelectControl.orgClose = function(modalId,controlId){
		$("#"+modalId).modal("hide");
		SelectControl.openPutAwayClear(controlId);
	};
	/**
	 * 人员界面收缩事件
	 */
	SelectControl.dataTreeToogle = function(obj){
		$(obj).find("i").toggleClass("fa-chevron-down").end().closest(".tree-list").next().slideToggle();
		return false;
	};
	/**
	 *拼装右侧展开按钮
	 */
	SelectControl.getZhaiKaiDom = function(clearBtnId) {
		var str = '<div class="input-group-btn m-l-xs selection-tree-btn fr">' +
			'<a class="a-icon i-trash fr m-b" href="###" id="' + clearBtnId + '"><i class="fa fa-trash"></i>清空</a>' +
			'<a class="a-icon i-new zk fr" href="###"><i class="fa fa-chevron-down"></i>展开</a>' +
			'<a class="a-icon i-new sq fr" href="###"><i class="fa fa-chevron-up"></i>收起</a></div>' +
			'</div><label class="help-block hide"></label>';
		return str;
	};
	/**
	 * 选择部门级联人员操作
	 * @param obj				dom对象
	 * @param selectId			select的ID
	 * @param modalId			弹出层DIVID
	 *
	 * 现在有过滤重名人员
	 */
	SelectControl.addSelect = function(obj ,selectId, modalId){
		if(!obj) return false;
		var openDiv = $("#"+modalId),
			selDiv  = $("#"+selectId),
			options = "",
			deptId  = $(obj).attr('dept'),
			value   = obj.value.split(","),
			isOps   = 0;
		if(deptId){
			if(obj.checked){
				//是单选就先清空
				if(obj.type == 'radio'){
					selDiv.empty();
				}
				var isAdd = SelectControl.selectUserFilter(selDiv.find("option"),value[1]);
				selDiv.append("<option value='"+value[0]+","+value[2]+"'>"+value[1]+"</option>");
			}else{
				selDiv.find("option[value='"+value[0]+","+value[2]+"']").remove();
			}
			isOps = openDiv.find("input[dept='"+deptId+"']").not(":checked").length;
			openDiv.find("#"+deptId).prop("checked", !isOps);
		}else{
			var $objs  = openDiv.find("input[dept='"+obj.id+"']");
			for(var i = 0,len = $objs.length; i < len; i++){
				var v = $objs[i].value.split(",");
				$objs[i].checked = obj.checked;
				if(options.indexOf(v[1]) == -1) {
		        	options += v[1];
		        	selDiv.find("option[value='"+v[0]+","+v[2]+"']").remove();
					selDiv.append("<option value='"+v[0]+","+v[2]+"'>"+v[1]+"</option>");
		        }
		        if(!obj.checked)selDiv.find("option[value='"+v[0]+","+v[2]+"']").remove();
			}	
		}
	};
	/**
	 * 过滤选中人员
	 * @param objs				select下所有的option
	 * @param str				需要过滤的字符串
	 */
	SelectControl.selectUserFilter = function(objs,str){
		var len = objs.length,
			i   = 0,
			falg = false;
		for(;i < len;i++){
			if(str === objs[i].text) {
				falg = true;
				break;
			}
		}
		return falg;
	};
	/**
	 * [openPutAwayClear 人员控件的展开、收起]
	 * @param  {[String]} controlId [控件ID]
	 * 此方法有待优化
	 */
	SelectControl.openPutAwayClear = function(controlId){
		var ell = $("#"+controlId);
		if(ell.length){
			var $ele  = ell.closest(".select2-wrap") || null,
				$btns = $ele.find(".selection-tree-btn"),
				$open = $btns.find('.zk'),
				$close= $btns.find('.sq'),
				$container = $ele.find('.select2-container');
			if($ele){
				var height = $ele.find(".select2-choices").actual("height");
				if(height >= 66){
					$container.css("max-height","67px");
					$btns.show(),$close.hide(),$open.show();
				}else{
					$btns.hide(),$close.hide(),$open.hide();
				}
			}
			$open.on('click',function(){
				$container.css("max-height","100%");
				$close.show();
				$(this).hide();
			});

			$close.on('click',function(){
				$container.css("max-height","67px");
				$(this).hide();
				$open.show();
				if(typeof resetPostscript == 'function'){
					resetPostscript();
				}
			});
		}
	};
	/**
	 * [SelectMove 组织人员控件 左右移动方式]
	 * 
	 * @param {[type]} options [description]
	 */
	function SelectMove(options){
		this.index = JCTree.index = JCTree.index + 1;
		this.select2CacheData = [];
		this.ztreesCacheData   = [];
		this.$zTree = null;
		this.option = $.extend({}, this.getOptions(options), options);
		return this.initialize(this.option);
	}

  	SelectMove.prototype = {
  		initialize : function(opt){
			this.$element = opt.container?$('#'+opt.container):null;
			this.getModalDom();
  		},
  		getModalDom: function(opt){
  			if(this.$element) this.$element.empty();
  			var opt = this.option,
  				checkDom = [
  				'<div class="select2-wrap input-group w-p100">',
  					'<div class="fl w-p100">',
	  					'<input type="hidden" id="'+opt.widgetId+'" name="'+opt.widgetName+'" style="width:100%"/>',
	  				'</div>',
	  				'<a class="btn btn-file no-all input-group-btn" '+(opt.isReadonly?'style="cursor:default"':'id="'+opt.openBtnId+'"')+'>',
	  					'<i class="fa fa-group"></i>',
	  				'</a>',
	  				SelectControl.getZhaiKaiDom(opt.clearBtnId)
  				],
  				radioDom = [
  					'<div class="select2-wrap input-group w-p100">',
  						'<input type="hidden" id="'+opt.widgetId+'" name="'+opt.widgetName+'" style="width:100%"/>',
	  					'<a class="btn btn-file no-all input-group-btn" '+(opt.isReadonly?'style="cursor:default"':'id="'+opt.openBtnId+'"')+'>',
		  					'<i class="fa fa-group"></i>',
		  				'</a>',
		  			'</div>',
		  			'<label class="help-block hide"></label>'
  				],
  				modalDom = [
  					'<div class="modal fade" id="'+opt.modalId+'" aria-hidden="false">',
  						'<div class="modal-dialog modal-tree">',
  							'<div class="modal-content">',
  								'<div class="modal-header clearfix">',
  									'<button type="button" class="close" data-dismiss="modal">×</button>',
  									'<h4 class="modal-title fl">组织人员选择</h4>',
  								'</div>',
  								'<div class="modal-body clearfix" style="overflow-x: hidden;">',
  									'<div class="w240 fl">',
  										'<section class="tree-ul tree-scroll">',
  											'<div id="'+opt.treeId+'" class="ztree"></div>',
  										'</section>',
  										'<section class="m-t-md">',
  											'<select id="'+opt.selectPersonId+'" multiple="true" class="w240 tree-select"></select>',
  										'</section>',
  									'</div>',
  									'<section class="m-l m-r fl tree-operate">',
  										'<a href="#" class="tree-move-down" id="'+opt.rightId+'"><i class="fa fa-double-angle-right"></i></a> ',
  										'<a href="#" class="tree-move-up" id="'+opt.leftId+'"><i class="fa fa-double-angle-left"></i></a>',
  									'</section>',
  									'<section class="fl pos-rlt">',
  										'<select id="'+opt.selectDeptAndPersonId+'" multiple="true" class="w200 tree-scroll-right tree-s-r tree-select"></select>',
  										'<div class="tree-move tree-ryzz"> ',
  											'<a href="###" class="tree-move-up" id="'+opt.upId+'"><i class="fa fa-caret-up"></i></a> ',
  											'<a href="###" class="tree-move-down" id="'+opt.downId+'"><i class="fa fa-caret-down"></i></a> ',
  										'</div>',
  									'</section>',
  								'</div>',
  								'<div class="modal-footer form-btn">',
  									'<button id="'+opt.confirmBtnId+'" class="btn dark" type="button">确 定</button>',
  									'<button class="btn" type="reset" data-dismiss="modal">取 消</button>',
  								'</div>',
  							'</div>',
  						'</div>',
  					'</div>'
  				];
  			if(this.$element) this.$element.append(opt.single?radioDom.join(''):checkDom.join(''));
  			JCTree.getModalBody().append(modalDom.join(''));
  			if(this.select2CacheData.length){
  				this.initSelect2();
  			}else{
  				this.initData();
  			}
  		},
  		show : function(callback){
  			var thie = this;
  			thie.initZtree();
  			thie.initEvent();
  			if(typeof callback === 'function')callback();
  			$("#"+thie.option.modalId).modal("show");
  		},
  		hide : function(callback){
  			$("#"+this.option.modalId).modal("hide");
  			if(typeof callback === 'function'){
				setTimeout(function(){callback();},350);
			}
  		},
  		readonly : function(){
  			var opt = this.option,
  				$select = $('#'+opt.widgetId);
  			$select.select2("readonly", true);
  			$("#"+opt.openBtnId).css('cursor','default').off();
  		},
  		unReadonly : function(){
  			var opt = this.option,
				$select = $('#'+opt.widgetId);
			$select.select2("readonly", false);
			$("#"+opt.openBtnId).css('cursor','pointer');
			this.initEvent();
  		},
  		setData : function(str){
  			var opt = this.option,
  				cacheData = this.ztreesCacheData,
  				datas     = [];
  			setTimeout(function(){
				if(typeof str === 'string'){
					var items = str.split(",");
					for(var i=0;i<items.length;i++){
						var id = items[i];
						for(var j=0;i<cacheData.length;j++){
							if(cacheData[j].id == id){
								datas.push({id:id, text:cacheData[j].text});
								break;
							}
						}
					}
					$('#'+opt.widgetId).select2("data", opt.single?{id:datas[0].id,text:datas[0].text}:datas);
				}else if(typeof str === 'object'){
					$('#'+opt.widgetId).select2("data", str);
				}
				SelectControl.openPutAwayClear(opt.widgetId);
  			},0);
  		},
  		clearValue : function(){
  			var opt = this.option,
  				$select = $('#'+opt.widgetId);
  			$select.select2("data", '');
  			if(!opt.single){
  				SelectControl.openPutAwayClear(opt.widgetId);
  			}
  		},
  		/**
  		 * [initData 初始化数据]
  		 * @return {[type]} [description]
  		 */
  		initData   : function(){
  			var thie = this,
  				opt  = thie.option;
  			$.ajax({
  				async : (opt.container?true:false),
				url : opt.url,
				type : 'get',
				success : function(data) {
					if(!data.length) return false;
					var oData = [],
						pData = [];
					for (var i = 0,len = data.length; i < len; i++){
						var item = data[i];
						oData.push({
							id : item.id,				//ID
							text : item.name,			//显示的内容
							type : "2",					//组织类型
							isChecked: item.isChecked,
							jp: Pinyin.GetJP(item.name)	//汉字的简拼
						});

						for (var k = 0; k < item.users.length; k++){
							var obj = item.users[k];
							pData.push({
								id : obj.id,					// ID
								text : obj.displayName,			// 显示的内容
								type : "1",						// 用户类型
								isChecked: obj.isChecked,
								jp: Pinyin.GetJP(obj.displayName)// 汉字的简拼
							});
						}

						thie.ztreesCacheData.push({
							id : item.id,
							pId : item.parentId,
							name : item.name,
							deptType : item.deptType,
							iconSkin : item.deptType == 0 ? "fa-flag" : "fa-office",
							users: item.users,
							isChecked: item.isChecked,
							chkDisabled : item.isChecked == 1 ? false : true
						});
					}
					//不使用select2情况下不用初始化
					if(thie.$element) {
						thie.select2CacheData.push(oData);
						thie.select2CacheData.push(pData);
						thie.initSelect2();
					}
				},
				error: function(){
					msgBox.tip({content: "获取人员组织失败", type:'fail'});
				}
			});	
  		},
  		initSelect2 : function(){
  			var thie = this,
  				opt  = thie.option,
  				$ele = $('#'+opt.widgetId),
  				datas= thie.select2CacheData;
  			$ele.select2({
  				placeholder	: " ",
			    multiple 	: !opt.single,
			    query		: function (query){
			        var data = {results: []};
			        if(datas.length > 0){
			        	$.each(datas, function(){
				        	$.each(this, function(){
					            if(query.term.length == 0 || this.text.toUpperCase().indexOf(query.term.toUpperCase()) >= 0 
					            		|| this.jp.toUpperCase().indexOf(query.term.toUpperCase()) >= 0){
					            	if(this.isChecked==undefined){
					            		data.results.push({id: this.id, text: this.text, type: this.type, disabled: false});
					            	}else{
					            		data.results.push({id: this.id, text: this.text, type: this.type, disabled: this.isChecked==1?false:true});
					            	}
					            }
				        	});
				        });
			        }
			        query.callback(data);
			    }
  			});
  			thie.showValue(opt.echoData);
			if(opt.isReadonly){
				$ele.select2("readonly", true);
			}
  			thie.initEvent();
  		},
  		initZtree : function(data){
  			var thie = this,
  				opt  = thie.option,
  				setting = {
					check:{
						enable: true,		 // 设置 zTree 的节点上是否显示 checkbox/radio
						nocheckInherit: true,// 是否自动继承父节点属性
						chkStyle: "checkbox",// 勾选框类型(checkbox 或 radio)
						chkboxType: { "Y" : "s", "N" : "ps" }
					},
					view:{
						selectedMulti: true,	// 设置是否允许同时选中多个节点
						showLine 	 : true,	// 设置 zTree 是否显示节点之间的连线
						dblClickExpand : false	//关闭双击展开节点功能
					},
					data:{// 确定zTree数据不需要转换为JSON格式,true是需要
						simpleData:{enable:true}
					},
					callback:{
						beforeClick: function(treeId, treeNode){
							if(treeNode.isChecked == 0){
								return false;
							}
							return true;
						},
						// 节点改变删除select框中的数据
						beforeCheck: function(treeId, treeNode){	
							var unSelectNodes = tree.getCheckedNodes(true);
							for(var i=0; i<unSelectNodes.length; i++) {
								if(unSelectNodes[i].users.length > 0){
									for(var j=0;j<unSelectNodes[i].users.length;j++){
										$("#"+opt.selectPersonId+" option[value='"+unSelectNodes[i].users[j].id+"']").remove();
									}
								}
							}
						},
						// 选中节点把人员添加到select框中
						onCheck: function(treeId, treeNode){	
							var selectNodes = tree.getCheckedNodes(true);
							for(var i=0; i<selectNodes.length; i++) {
								if(selectNodes[i].users.length > 0){
									for(var j=0;j<selectNodes[i].users.length;j++){
										$("#"+opt.selectPersonId).append("<option value='"+selectNodes[i].users[j].id+"'>"+selectNodes[i].users[j].displayName+"</option>");
									}
								}
							}
						},
						// 用于捕获节点被点击的事件回调函数
						onClick: function(event, treeId, treeNode, clickFlag){	
						},
						// 节点双击的事件回调函数
						onDblClick: function(event, treeId, treeNode){
							var treeObj = $.fn.zTree.getZTreeObj(opt.treeId);
							var nodes = treeObj.getSelectedNodes();
							if(nodes.length==0){
								return false;
							}
							if(opt.single){
								$deptAndPerson.find("option:last").remove();
								$deptAndPerson.append("<option value='"+nodes[0].id+",2'>"+(nodes[0].name+opt.surnameDept)+"</option>");
								treeObj.cancelSelectedNode(nodes[0]);
							}else{
								$deptAndPerson.find("option[value='"+nodes[0].id+",2']").remove();
								$deptAndPerson.append("<option value='"+nodes[0].id+",2'>"+(nodes[0].name+opt.surnameDept)+"</option>");
								treeObj.cancelSelectedNode(nodes[0]);
							}
							return false;
						}
				}
			};
			var zNodes = this.ztreesCacheData;
			if(zNodes.length){
				var tree = $.fn.zTree.init($("#"+opt.treeId), setting, zNodes);
				tree.expandAll(true);
				if(data){
					for(var i = 0; i < data.length;i++){
						var v = data[i];
						if(v.type == 2){
							var node = tree.getNodeByParam("id", v.id, null);
							if(node && node.parentTId)tree.checkNode(node, true, false, true);
						}
					}
				}
			}
  		},
  		/**
  		 * [initEvent 初始化事件]
  		 * @return {[type]} [description]
  		 */
  		initEvent  : function(){
  			var thie = this,
  				opt  = thie.option,
  				$deptAndPerson = $('#'+opt.selectDeptAndPersonId);
  			/**
  			 * [弹出显示事件]
  			 */
			$("#"+opt.openBtnId).on('click',function(){
				$deptAndPerson.empty();
				$('#'+opt.selectPersonId).empty();
				var data =  $('#'+opt.widgetId).select2("data");
				if(opt.single &&　data){
					data = new Array(data);
				}
				if(data){
					for (var i = 0,len = data.length;i < len;i++){
						var v = data[i];
						$deptAndPerson.append("<option value='"+v.id+","+v.type+"'>"+(v.text+''+(v.type == 1?opt.surnamePerson:opt.surnameDept))+"</option>");
					}
				}
				thie.initZtree(data);
				$("#"+opt.modalId).modal("show");	//显示部门人员界面
			});
  			/**
  			 * 页面清空已选信息事件
  			 */
  			if(!opt.single){
  				$("#"+opt.clearBtnId).on("click", function(){
					$("#"+opt.widgetId).select2("data", "");
					SelectControl.openPutAwayClear(opt.widgetId);
					if(typeof resetPostscript == 'function'){
						resetPostscript();
					}
				});
  			}
  			/**
  			 * [向右]
  			 */
  			$('#'+opt.rightId).on('click',function(){
  				var persons = $("#"+opt.selectPersonId).find("option:selected");
  				thie.actions['right'].call(thie,persons);
  			});
  			/**
  			 * [向左]
  			 */
  			$('#'+opt.leftId).on('click',function(){
  				var persons = $deptAndPerson.find("option:selected");
  				thie.actions['left'].call(thie,persons);
  			});
  			/**
  			 * [向上]
  			 */
  			$('#'+opt.upId).on('click',function(){
				thie.actions['up'].call(thie,$deptAndPerson);
  			});
  			/**
  			 * [向下]
  			 */
  			$('#'+opt.downId).on('click',function(){
				thie.actions['down'].call(thie,$deptAndPerson);
  			});
  			/**
  			 * [select选择框双击事件--向右添加]
  			 */
  			$('#'+opt.selectPersonId).on('dblclick',function(){
				thie.actions['dbright'].call(thie,$("#"+opt.selectPersonId),$deptAndPerson);
  			});
  			/**
  			 * [select选择框双击事件--向左添加]
  			 */
  			$deptAndPerson.on('dblclick',function(){
				thie.actions['dbleft'].call(thie,$deptAndPerson,$("#"+opt.selectPersonId));
  			});
  			/**
  			 * [确定按钮]
  			 */
  			$('#'+opt.confirmBtnId).on('click',function(){
				var selecteds = $deptAndPerson.find("option");
				if(selecteds.length){
					var result =[];
					for(var i = 0,len = selecteds.length;i < len;i++){
						var data  = selecteds[i],
							value = data.value.split(','),
							text  = data.text.substr(0,data.text.indexOf(value[1] == '1'?opt.surnamePerson:opt.surnameDept));
						result.push({
							id	: value[0],
							type: value[1],
							text: text
						});
					}
					$("#"+opt.selectPersonId).empty();
					$deptAndPerson.empty();
					thie.showValue(result);
				}else{
					msgBox.info({content:'请选择组织或人员',type:'fail'});
					return false;
				}
				$("#"+opt.modalId).modal("hide");
  			});
  		},
  		/**
  		 * [showValue select2回显]
  		 * @param  {[type]} data [回显数据]
  		 */
  		showValue  : function(data){
  			var opt = this.option;
  			if(data){
  				$('#'+opt.widgetId).select2("data", opt.single?data[0]:data);
  				if(opt.callback){
  					SelectControl.openPutAwayClear(opt.widgetId);
  				}
				if(typeof opt.callback === 'function'){
					opt.callback.call(this,data);
  				}
  			}
  		},
		/**
		 * 移动人员事件
		 */
  		actions : {
  			up : function(select){
				if(select.val() == null){
					msgBox.tip({content: "请选择升序的组织或人员", type:'fail'});
				}else{
					var $selects = select.find('option:selected');
					if($selects.length > 1){
						msgBox.tip({content: "请选择一项进行调整", type:'fail'});
					}else{
						var optionIndex = select.get(0).selectedIndex;
						if(optionIndex > 0){
							$selects.insertBefore($selects.prev('option'));
						}
					}
				}
  			},
  			down : function(select){
				if(select.val() == null){
					msgBox.tip({content: "请选择升序的组织或人员", type:'fail'});
				}else{
					var $selects = select.find('option:selected');
					if($selects.length > 1){
						msgBox.tip({content: "请选择一项进行调整", type:'fail'});
					}else{
						var optionIndex = select.get(0).selectedIndex;
						if(optionIndex > 0){
							$selects.insertAfter($selects.next('option'));
						}
					}
				}
  			},
			/**
			 * 向左移动
			 */
  			left : function(persons){
  				var opt = this.option,
  					len = persons.length;
  				if(len > 0){
					for(var i = 0,len = persons.length;i < len;i++){
						var v = persons[i],
							item = v.value.split(',');
						if(item[1] == '1'){
							$("#"+opt.selectPersonId).append("<option value='"+item[0]+"'>"+v.text.substr(0,v.text.indexOf(opt.surnamePerson))+"</option>");
							$(v).remove();
						}else{
							$(v).remove();
						}
					}
				}else{
					msgBox.tip({content: "请选择要移除的组织或人员", type:'fail'});
				}
  			},
			/**
			 * 向右移动
			 */
  			right : function(persons){
  				var opt     = this.option,
  					treeObj = $.fn.zTree.getZTreeObj(opt.treeId),
  					nodes   = treeObj.getSelectedNodes(),
  					$select = $('#'+opt.selectDeptAndPersonId),
  					len     = persons.length;
  				if(nodes.length <= 0 && len <= 0){
					msgBox.tip({content: "请选择要添加的组织或人员", type:'fail'});
					return false;
				}
				//移动组织
				if(nodes.length > 0){
					opt.single?$select.empty():$select.find("option[value='"+nodes[0].id+",2']").remove();
					$select.append("<option value='"+nodes[0].id+",2'>"+nodes[0].name+''+opt.surnameDept+"</option>");
					treeObj.cancelSelectedNode(nodes[0]);
				}
				//移动人员
				if(len > 0){
					for(var i = 0,len = persons.length;i < len;i++){
						var v = persons[i];
						if(opt.single){
							$select.empty();
						}else{
							$select.find("option[value='"+v.value+",1']").remove();
							$("#"+opt.selectPersonId+" option[value='"+v.value+"']").remove();
						}
						$select.append("<option value='"+v.value+",1'>"+(v.text+opt.surnamePerson)+"</option>");
					}
				}
  			},
			/**
			 *双击向右移动
			 */
  			dbright : function(ele,newElement){
				var opt  = this.option,
					objs = ele.find('option:selected');
				if(objs.length){
					var v = objs[0];
					opt.single?newElement.empty():objs.remove();
					newElement.append("<option value='"+v.value+",1'>"+(v.text+opt.surnamePerson)+"</option>");

				}
  			},
			/**
			 *双击向左移动
			 */
  			dbleft  : function(ele,newElement){
				var opt  = this.option,
					objs = ele.find('option:selected');
				if(objs.length){
					var v = objs[0],
						value = v.value.split(',');
					if(value[1] == '1' && !opt.single){
						newElement.append("<option value='"+value[0]+",1'>"+v.text.substr(0,v.text.indexOf(opt.surnamePerson))+"</option>");
					}
					objs.remove();
				}
  			}
  		},
  		/**
  		 * [getOptions 获取参数]
  		 * @return {[type]} [description]
  		 */
  		getOptions : function(opt){
  			var index = this.index,
  				option = {
  					container 	: null,
  					//  单选或多选
  					single 		: false,
  					//控件id
  					controlId   : null,
  					//url
  					url  		: SelectControl.DEFALUT.urls.orgdept,
  					//	主页文本框控件ID
  					widgetId 	: (opt.controlId?opt.controlId:'orgAndPersonId'+index),
  					//	主页文本框控件Name
  					widgetName 	: (opt.controlId?opt.controlId.split("-")[1]:'orgAndPersonName'+index),
  					//  回显数据
  					echoData 	: null,
  					//  是否只读
  					isReadonly 	: false,
  					//  回调函数
  					callback 	: null,
  					//	主页按钮ID
  					openBtnId 	: 'openBtn'+ index,
  					//	modalDIV的ID
  					modalId  	: 'modal_'+ index,
  					//	树控件的ID
  					treeId 		: 'tree_'+ index,
  					//	选择人员控件的ID
  					selectPersonId 	: 'selectPerson'+ index,
  					//	选择部门与人员的ID
  					selectDeptAndPersonId 	: 'selectDeptAndPerson'+ index,
  					//  向右按钮ID
  					rightId 	: 'rightBtn'+ index,
  					//  向左按钮ID
  					leftId 		: 'leftBtn'+ index,
  					//  向上按钮ID
  					upId  		: 'upBtn'+ index,
  					//  向下按钮ID
  					downId 		: 'downBtn'+ index,
  					//  确认按钮ID
  					confirmBtnId: 'confirmBtn'+ index,
  					//  清空按钮ID
  					clearBtnId 	: 'clearBtn'+ index,
					surnamePerson : '[人员]',
					surnameDept   : '[组织]'
  				};
			return option;
  		}
  	};
  	/**
  	 * [SelectZtree description]
  	 * @param 
  	 * 		id
  	 * 		url
  	 * 		onClick
  	 * 		onCheck
  	 * 		expand
  	 * 		selectNode
  	 */
  	function SelectZtree(options){
  		this.ztreesCacheData   = [];
  		this.option   = $.extend({}, this.getOptions(options), options);
		return this.initialize(this.option);
  	}

  	SelectZtree.prototype = {
  		initialize : function(){
  			var thie = this,
  				opt  = thie.option,
  				$element = $("#"+opt.container),
  				rootns   = null;
  			if(!$element.length){
  				msgBox.tip({content: "容器id填写错误！", type:'fail'});
  			}
  			$element.addClass('ztree');
  			if(opt.zNodes) thie.ztreesCacheData = opt.zNodes;
  			if(thie.ztreesCacheData.length){
  				thie.initZtree($element,thie.ztreesCacheData);
				return false;
  			}
  			$.ajax({
				url : opt.url,
				type : 'get',
				success : function(data) {
					if(data){
						for(var i = 0,len = data.length;i < len;i++){
							var o = data[i];
							thie.ztreesCacheData.push({
								id : o.id,
								pId : o.parentId,
								name : o.name,
								deptType : o.deptType,
								checkState : false,
								iconSkin : o.deptType==0 ? "fa-flag" : "fa-office",
								leaderName: o.displayName,
								userType: o.userType,
								isChecked: o.isChecked
							});
						}
						thie.initZtree($element,thie.ztreesCacheData);
					}
				}
			});
  		},
  		initZtree  : function($element,nodes){
  			var thie = this,
  				opt  = thie.option,
  				tree = $.fn.zTree.init($element, opt.setting, nodes);
			if(opt.expand){
				tree.expandAll(true);
				if(opt.selectNode){
					var node = tree.getNodeByParam("id",opt.selectNode);
					tree.selectNode(node, true);
					node.checkState = true;
					if(typeof opt.onClick === 'function'){
						opt.onClick.call(thie,$,opt.selectNode,node);
					}
				}else{
					var rootns = opt.rootNode?nodes[0]:null;
					if(opt.rootNode && rootns){
						var node = tree.getNodeByParam("id",rootns.id);
						tree.selectNode(node, true);
						node.checkState = true;
						if(typeof opt.onClick === 'function'){
							opt.onClick.call(thie,$,node.id,node);
						}
					}
				}
			}
  		},
  		getRootNode: function(){
  			var node = $.fn.zTree.getZTreeObj(this.option.container);
  			return node;
  		},
  		/**
  		 * [getChildNodesId description]
  		 * @param  {[type]} node [ZTree对象]
  		 * @return 
  		 * 		字符串id以,间隔  '1231,41,51,516'
  		 */
  		getChildNodesId : function(node){
  			var opt = this.option,
  				treeObj = $.fn.zTree.getZTreeObj(opt.container),
				childNodes = treeObj.transformToArray(node),
		    	nodes = "";
		    for(var i = 0; i < childNodes.length; i++) {
		    	if(childNodes[i].isChecked == 1){
		    		nodes = nodes + childNodes[i].id + ",";
		    	}
		    }
		    return nodes.substring(0, nodes.length-1);
  		},
  		getOptions : function(opt){
  			function getZtreeSetting(){
				return {
  				//权限树
					check:{
						enable: opt.enable,//设置 zTree 的节点上是否显示 checkbox/radio
						nocheckInherit: false,//是否自动继承父节点属性
						chkStyle: opt.chkStyle,//勾选框类型(checkbox 或 radio)
						radioType : "all"//radio的分组范围[setting.check.enable=true且setting.check.chkStyle="radio"时生效]
					},
					view:{
						selectedMulti: false,//设置是否允许同时选中多个节点
						showLine: false//设置 zTree 是否显示节点之间的连线
					},
					data:{
						simpleData:{
							enable:true//确定zTree数据不需要转换为JSON格式,true是需要
						}
					},
					callback:{
						beforeClick: typeof opt.onBeforeClick === 'function'?opt.onBeforeClick:null,
						////用于捕获 checkbox / radio 被勾选 或 取消勾选的事件回调函数
						onCheck: typeof opt.onCheck === 'function'?opt.onCheck:null,	
						//用于捕获节点被点击的事件回调函数
						onClick: typeof opt.onClick === 'function'?opt.onClick:null,	
						//onRemove : onRemove
					}
				};
  			}
  			var index = this.index,
  				option = {
  					container: null,
  					url      : SelectControl.DEFALUT.urls.ztree,
  					setting  : getZtreeSetting(),
  					zNodes   : null,
  					rootNode : false,	//默认选中根节点
  					expand   : false,	//是否默认展开
  					selectNode : null,	//默认选中节点 需要expand为true
  					enable   : false,	//是否显示 checkbox/radio
  					chkStyle : 'radio'	//勾选框类型(checkbox 或 radio)
  				};
			return option;
  		}
  	};

  	function SelectMutual(options){
  		this.index = JCTree.index = JCTree.index + 1;
  		this.selectCacheData   = [];
  		this.option   = $.extend({}, this.getOptions(options), options);
		return this.initialize(this.option);
  	}

  	SelectMutual.prototype = {
  		initialize : function(){
  			var thie = this,
  			    opt  = thie.option;
  			if(opt.echoData){

  			}
  			thie.appendDom();
  			thie.initData();
  			thie.initEvent();
  		},
  		show : function(callback){
  			var thie = this,
  				opt  = thie.option,
  				sDate= $('#'+opt.controlId).select2('data'),
  				$ele = $('#'+opt.leftSelectId);
  			thie.refresh();
  			if(sDate){
  				var results;
  				if(opt.single){
  					results = $ele.find("option[value="+sDate.id+"]");
  					if(results.length)thie.toRight(results[0]);
  				}else{
  					for(var i=0;i<sDate.length;i++){
  						results = $ele.find("option[value="+sDate[i].id+"]");
  						if(results.length)thie.toRight(results[0]);
  					}
  				}
  			}
  			if(typeof callback === 'function') callback();
  			$('#'+opt.modalId).modal('show');
  		},
  		hide : function(callback){
  			$('#'+this.option.modalId).modal('hide');
  			if(typeof callback === 'function'){
				setTimeout(function(){callback();},350);
			}
  		},
  		readonly : function(){
  			var opt = this.option;
  			$('#'+opt.openBtnId).css('cursor','default').off();
  			$("#"+opt.controlId).select2("readonly", true);
  		},
  		unReadonly : function(){
  			var opt = this.option;
  			$('#'+opt.openBtnId).css('cursor','pointer');
  			this.initEvent();
  			$("#"+opt.controlId).select2("readonly", false);
  		},
  		setData : function(str){
  			var opt = this.option,
  				cacheData = this.selectCacheData,
  				datas     = [];
  			setTimeout(function(){
				if(typeof str === 'string'){
					var items = str.split(",");
					for(var i=0;i<items.length;i++){
						var id = items[i];
						for(var j=0;i<cacheData.length;j++){
							if(cacheData[j].id == id){
								datas.push({id:id, text:cacheData[j].text});
								break;
							}
						}
					}
					$('#'+opt.controlId).select2("data", opt.single?{id:datas[0].id,text:datas[0].text}:datas);
				}else if(typeof str === 'object'){
					$('#'+opt.controlId).select2("data", opt.single?{id:str[0].id,text:str[0].text}:str);
				}
				SelectControl.openPutAwayClear(opt.controlId);
  			},0);
  		},
  		clearValue : function(){
  			var opt = this.option;
  			$("#"+opt.controlId).select2("data", '');
  			if(!opt.single){
  				SelectControl.openPutAwayClear(opt.controlId);
  			}
  		},
  		refresh : function(){
  			var opt 	  = this.option,
  				cacheData = this.selectCacheData,
  				$ele  	  = $('#'+opt.leftSelectId);
  			$ele.empty();
  			$('#'+opt.rightSelectId).empty();
  			for(var i = 0,len = cacheData.length;i < len;i++){
  				var node = cacheData[i];
  				$ele.append('<option value="'+node.id+'">'+node.text+'</option>');
  			}
  		},
  		initData   : function(){
  			var thie = this,
  				opt  = thie.option;
			$.ajax({
				async : (opt.container?true:false),
				url : opt.url,
				type : 'get',
				success : function(data) {
					if(data){
						for(var i = 0,len = data.length;i < len;i++){
							var o = data[i];
							thie.selectCacheData.push({
								id : o.code,					//ID
								text : o.text,					//显示的内容
								hp: Pinyin.GetHP(o.text),		//两个汉字输入全拼,三个以上的汉字，第一个汉字全拼，后面的汉字简拼
								qp: Pinyin.GetQP(o.text),		//汉字的全拼
								jp: Pinyin.GetJP(o.text),		//汉字的简拼
								wc: Pinyin.getWordsCode(o.text)	//单词首字母获取
							});
						}
						if(opt.container)thie.initSelect2();
					}
				},
				error: function(){
					msgBox.tip({content: "获取人员失败", type:'fail'});
				}
			});
  		},
  		initSelect2 : function(){
  			var opt = this.option,
  				cacheData = this.selectCacheData;
  			$("#"+opt.controlId).select2({
			    placeholder: " ",		//文本框占位符显示
			    allowClear: true,		//允许清除
			    multiple: !opt.single,  //单选or多选
			    query: function (query){
			        var data = {results: []};
			        $.each(cacheData, function(){
			            if(query.term.length == 0 || this.text.toUpperCase().indexOf(query.term.toUpperCase()) >= 0 
			            		|| this.hp.toUpperCase().indexOf(query.term.toUpperCase()) >= 0
			            		|| this.qp.toUpperCase().indexOf(query.term.toUpperCase()) >= 0
			            		|| this.jp.toUpperCase().indexOf(query.term.toUpperCase()) >= 0
			            		|| this.wc.toUpperCase().indexOf(query.term.toUpperCase()) >= 0){
			                data.results.push({id: this.id, text: this.text});
			            }
			        });
			        query.callback(data);
			    }
			});
  			if(opt.echoData){
  				var d = opt.echoData;
  				$("#"+opt.controlId).select2('data',opt.single?{id:d[0].id,text:d[0].text}:d);
  			}
  		},
  		initEvent : function(){
  			var thie = this,
  				opt  = thie.option;
  			//确定
  			$('#'+opt.confirmId).on('click',function(){
  				thie.showMutualValue();
  			});
  			//打开
  			$('#'+opt.openBtnId).on('click',function(){
				thie.show();
  			});
  			//左右移动
  			$('#move'+opt.modalId).on('click','p',function(){
				var type = $(this).attr('name'),
					$ele = ((type == 'left' || type == 'leftAll')?$('#'+opt.leftSelectId):$('#'+opt.rightSelectId));
				if(opt.single && (type == 'leftAll' || type == 'rightAll')){
					return false;
				}
				thie.actions[type].call(thie,$ele,opt.single);
  			});
  			//左侧选择框双击
  			$('#'+opt.leftSelectId).on('dblclick',function(){
  				var option = $("option:selected",this)[0];
  				thie.toRight(option);
  			});
  			//右侧选择框双击
  			$('#'+opt.rightSelectId).on('dblclick',function(){
  				var option = $("option:selected",this)[0];
  				thie.toLeft(option);
  			});
  			//清空按钮
  			if(!opt.single){
  				$('#'+opt.clearBtnId).on('click',function(){
					$("#"+opt.controlId).select2("data", "");
					SelectControl.openPutAwayClear(opt.controlId);
					if(typeof resetPostscript == 'function'){
						resetPostscript();
					}
				});
  			}
  		},
  		actions : {
  			left : function($ele,single){
  				var selecteds = $ele.find('option:selected');
  				if(single && selecteds.length > 1){
  					msgBox.tip({content: "只能选择一个条目", type:'fail'});
  					return false;
  				}
  				if(selecteds.length){
  					this.toRight(selecteds);
  				}
  			},
			leftAll : function($ele){
				var selecteds = $ele.find('option');
  				if(selecteds.length){
  					this.toRight(selecteds);
  				}
			},
			right : function($ele,single){
				var selecteds = $ele.find('option:selected');
				if(single && selecteds.length > 1){
  					msgBox.tip({content: "只能选择一个条目", type:'fail'});
  					return false;
  				}
  				if(selecteds.length){
  					this.toLeft(selecteds);
  				}
			},
			rightAll :function($ele){
				var selecteds = $ele.find('option');
  				if(selecteds.length){
  					this.toLeft(selecteds);
  				}
			}
  		},
  		toLeft : function(obj){
  			var opt = this.option,
  				$ele= $('#'+opt.leftSelectId);
  			this.move(obj,$ele,opt.single);
  		},
  		toRight : function(obj){
  			var opt = this.option,
  				$ele= $('#'+opt.rightSelectId);
  			this.move(obj,$ele,opt.single);
  		},
  		move : function(obj,$ele,single){
  			if(!obj.length){
  				$ele[single?'html':'append']('<option value="'+obj.value+'">'+obj.text+'</option>');
  				if(!single)$(obj).remove();
  			}else{
  				for(var i = 0,len = obj.length;i < len;i++){
  					$ele.append('<option value="'+obj[i].value+'">'+obj[i].text+'</option>');
  					$(obj).remove();
  				}
  			}
  		},
  		showMutualValue : function(){
  			var thie = this,
  				opt  = thie.option,
  				sDate   = $("#"+opt.rightSelectId).find("option"),
  				results = [];
  				
  			if(sDate.length == 0){
				msgBox.info({content:"请选择数据",type:"fail"});
				return false;
			}
			$.each(sDate,function(i, val){
				results.push({
					id: this.value,
					text: this.text
				});
			});
			$('#'+opt.controlId).select2("data", opt.single?{id: results[0].id, text: results[0].text}:results);
  			$('#'+opt.modalId).modal('hide');
  			SelectControl.openPutAwayClear(opt.controlId);
  			if(typeof opt.callback === 'function'){
  				opt.callback.call(thie,results);
  			}
  		},
  		appendDom : function(){
  			var opt = this.option;
  			var pDom = [
  				'<div class="select2-wrap input-group  w-p100">',
  					'<div class="fl w-p100">',
  						'<input type="hidden" id="'+opt.controlId+'" name="'+opt.controlId.split("-")[1]+'" search="search" style="width:100%"/>',
  					'</div>',
  					'<a class="btn btn-file no-all input-group-btn" href="###"  id="'+opt.openBtnId+'" role="button">',
  						'<i class="fa fa-group"></i>',
  					'</a>',
  					(opt.single?'':SelectControl.getZhaiKaiDom(opt.clearBtnId)),
  				'</div>'
  			],
  			mDom = [
  				'<div class="modal fade" id="'+opt.modalId+'" aria-hidden="false">',
  					'<div class="modal-dialog modal-tree">',
  						'<div class="modal-content">',
  							'<div class="modal-header clearfix">',
  								'<button type="button" class="close" data-dismiss="modal" onClick="">×</button>',
  								'<h4 class="modal-title fl">'+opt.title+'</h4>',
  							'</div>',
  							'<div class="modal-body clearfix">',
  								'<div class="ms2side__div">',
  									'<div class="ms2side__select">',
  										'<div class="ms2side__header">'+opt.title+'选择框</div>',
  										'<select title="'+opt.title+'选择框" name="'+opt.leftSelectId+'" id="'+opt.leftSelectId+'" size="0" multiple="multiple" class="select-list-h"></select>',
  									'</div>',
  									'<div class="ms2side__options" id="move'+opt.modalId+'">',
  										'<p class="AddOne" title="添加" name="left"><span></span></p>',
  										'<p class="AddAll" title="添加所有" name="leftAll"><span></span></p>',
  										'<p class="RemoveOne" title="删除" name="right"><span></span></p>',
  										'<p class="RemoveAll" title="删除所有" name="rightAll"><span></span></p>',
  									'</div>',
  									'<div class="ms2side__select">',
  										'<div class="ms2side__header">已选'+opt.title+'框</div>',
  										'<select title="已选'+opt.title+'框" name="'+opt.rightSelectId+'" id="'+opt.rightSelectId+'" size="0" multiple="multiple" class="select-list-h"></select>',
  									'</div>',
  								'</div>',
  							'</div>',
  							'<div class="modal-footer form-btn">',
  								'<button class="btn dark" type="button" id="'+opt.confirmId+'">保 存</button>',
  								'<button class="btn" type="button" data-dismiss="modal">关 闭</button>',
  							'</div>',
  						'</div>',
  					'</div>',
  				'</div>'
  			];
  			if(opt.container){
  				$('#'+opt.container).html(pDom.join(''));
  			}
  			JCTree.getModalBody().append(mDom.join(''));
  		},
  		getOptions : function(opt){
  			var option = {
  				container : null,
				controlId : 'mutualName'+this.index+'-mutualName',
				url       : SelectControl.DEFALUT.urls.mutual,
				single    : false,
				title     : '项目',
				callback  : null,
				echoData  : null,
				modalId   : 'openLeftRightDiv'+this.index,
				openBtnId : 'openLeftRightBtn'+this.index,
				clearBtnId: 'leftRightClearBtn'+this.index,
				leftSelectId : 'leftList'+this.index,
				rightSelectId: 'rightList'+this.index,
				confirmId    : 'okMutualBtn'+this.index
  			};
  			return option;
  		}
  	};

	JCTree.init = function(option){
		return new SelectControl(option);
	};

	JCTree.orgDept = function(option){
		return new SelectMove(option);
	};

	JCTree.ztree = function(option){
		return new SelectZtree(option);
	};

	JCTree.mutual = function(option){
		return new SelectMutual(option);
	};

	for (var i in SelectControl) {
		JCTree[i] = SelectControl[i];
    }

	window.JCTree = JCTree;
})(jQuery);