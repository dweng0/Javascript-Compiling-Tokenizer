define(function(require) {

	const Collection = require('core/collections/objectcollection');
	const formatStrings = require('core/helpers/formatters/datasize');
	const Details = require('shared/layouts/details');
	const Poller = require('shared/controllers/poller');
	const moment = require('moment');
	const template = require('tpl!extensions/nodes/hbbrepository/storage/templates/storedetails.html');
	
	const ChartView = Marionette.LayoutView.extend({
		tagName: 'canvas',
		template: false,
		chart: null,
		initialize: function(options)
		{
			Marionette.LayoutView.prototype.initialize.call(this, options);
		},

		onRender: function()
		{
			let options = {
				responsive: true,
				maintainAspectRatio: false,
				elements: {
					line: {
						tension: 0
					}
				},
				plugins: {
					filler: {
						propagate: false
					}
				},
				scales: {
					xAxes: [{
						display: true,
						distribution: 'linear',
						type: 'time',
						 time: {
							displayFormats: {
								'millisecond': 'HH:mm:ss',
								'second': 'HH:mm:ss',
								'minute': 'HH:mm:ss',
								'hour': 'ddd HH:mm',
								'day': 'MMM DD HH:mm',
								'week': 'MMM DD HH:mm',
								'month': 'YYYY-MM-DD',
								'quarter': 'YYYY-MM-DD',
								'year': 'YYYY-MM-DD',
							 }
						 }
					}],
					yAxes: [
					{
						display: true,
						min:0,
						scaleLabel: {
							display: true,
							labelString: 'GB'
						}
					}]
				},
				legend: {
					display: true,
					position: 'right'
				}
			};

			this.chart = new Chart(this.el, {
				type: 'line',
				data: {
					labels: [],
					datasets: [{
						backgroundColor: '#0000aa',
						borderColor: '#0000aa',
						data: [],
						label: tr("Size"),
						fill: true,
						pointRadius: 0,
						borderWidth: 2,
						group: 1
					}]
				},
				options: Chart.helpers.merge(options, {
					title: {
						text: 'GB',
						display: false
					}
				})
			});
			const collection = new Collection(null, {
					handler: 'StorageManagement',
					representativeDataType: 'Stores',
					innerObject: 'ingestStatistic',
					targetNode: this.model.get('_storageNodeId'),
					parentResourceId: this.model.get('id'),
					collectionName:'statistics'
				});

			const chart = this.chart;
			this.listenTo(collection, 'sync', function(collection) {
					chart.data.datasets[0].data = collection.map(
						function(item) {
							return {x:moment.utc(item.get('dateTime'), moment.ISO_8601, true), y:parseFloat((item.get('size') / 1024 / 1024 / 1024 )).toFixed(4)}
						});
					chart.update();
			});
			
			const poller = new Poller(collection, {
				delay: 30000,
				autoStart: false
			}, this);

			poller.start();
		}
	});

	return Details.extend({
		template: template,

		regions: {
			statisticsChart: '[data-component="chart"]',
		},
		
		/**
		 * @constructs
		 */
		initialize: function(options)
		{
			Details.prototype.initialize.call(this, options);
		},

		onRender: function()
		{
			this.showChildView('statisticsChart', new ChartView({model: this.model}));
		}
	});
});
